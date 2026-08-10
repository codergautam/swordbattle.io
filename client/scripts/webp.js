/* Converts public/assets images to .webp alongside the originals.
 *
 *   node scripts/webp.js          convert anything new or changed
 *   node scripts/webp.js --force  re-convert everything
 *   node scripts/webp.js --check  exit 1 if anything is stale (for CI)
 *
 * LOSSLESS ONLY. Every .webp here decodes to exactly the pixels of its source -
 * not "visually identical", identical - and each one is checked against the
 * source after encoding, so a file that is not bit-exact fails the run instead of
 * shipping. The game looks precisely as it did before any of this existed; the
 * only thing WebP is doing is packing the same pixels into fewer bytes.
 *
 * There is deliberately no lossy path. It was tried at a quality gate and the
 * gate was the problem: an averaged error score cannot see localised damage, so
 * flat sprite art passed while every edge in it was chewed up. Tightening the
 * numbers only moved the line - lossy WebP is always 4:2:0, and chroma
 * subsampling wrecks saturated hard-edged art no matter the bitrate. goldenBlade
 * still had 5% of its pixels visibly off at q98. Do not reintroduce it.
 *
 * Where lossless comes out bigger than the source - mostly JPEGs, which are
 * already lossy, so re-encoding their decoded pixels exactly is a bad trade - no
 * .webp is written at all and the loader serves the original. That is also
 * pixel-perfect, just larger.
 *
 * Staleness is tracked in a content manifest, not mtimes - a fresh clone gives
 * every file the same checkout time, so mtime comparison made --check a coin flip
 * in CI. Bump POLICY when the encoder settings change so everything re-converts.
 *
 * Requires sharp, which is deliberately NOT a dependency of this package: the
 * generated .webp files are committed, so this only runs when assets change.
 * Listing it pulled a ~50MB native binary into every CI install and pinned the
 * whole project to sharp's Node engine range. Install it on demand instead:
 *
 *   npm i --no-save sharp
 */
const os = require('os');
const { Worker, isMainThread, parentPort } = require('worker_threads');

const JOBS = Math.max(1, Math.min(16, os.cpus().length - 2));

/* sharp runs every encode on the libuv threadpool, which holds 4 threads unless
   UV_THREADPOOL_SIZE says otherwise - and libuv reads that once, at process
   start. Assigning process.env here is too late: the worker threads below all
   share the one pool, so 16 of them queue behind 4 slots and the box sits at
   ~7% while the run crawls. Setting it properly is worth ~7x, so if the caller
   did not, re-exec once with it set. */
if (isMainThread && !process.env.UV_THREADPOOL_SIZE && !process.argv.includes('--check')) {
  const r = require('child_process').spawnSync(
    process.execPath,
    [__filename, ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, UV_THREADPOOL_SIZE: String(JOBS * 3) } },
  );
  process.exit(r.status === null ? 1 : r.status);
}

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');

/* Only the converting path needs sharp. --check compares hashes and filenames,
   so CI can run the guard on a plain `actions/checkout` with nothing installed. */
let sharp;
if (!checkOnly) {
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('This script needs sharp, which is not installed by default.\n');
    console.error('  cd client && npm i --no-save sharp\n');
    process.exit(1);
  }
  // One libvips thread per image, many images at once. The other way round leaves
  // most of the machine idle, because a single small encode can't fill 32 cores.
  sharp.concurrency(1);
  sharp.cache(false);
}

/* Whole files go to workers, not just the encodes. diff() walks every pixel in
   JS, and on one thread that loop serialises the entire run behind it - the
   encodes are async and parallel, the comparison is not, and the box sat at 2 of
   32 cores busy. Shipping the whole read/encode/compare/write job out gives each
   worker its own event loop and the machine actually fills up. */
const isWorker = !isMainThread;

const ASSETS = path.join(__dirname, '..', 'public', 'assets');
const MANIFEST = path.join(__dirname, 'webp-manifest.json');

const POLICY = 3;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ASSETS, p).replace(/\\/g, '/');
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);

/* Returns the number of channel samples that differ between the source pixels
   and the re-decoded .webp. Anything but 0 means the encode was not lossless. */
async function channelsDiffering(a, webpBuf) {
  const b = await sharp(webpBuf).ensureAlpha().raw().toBuffer();
  if (a.length !== b.length) return Infinity;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    // Compare alpha too: a sprite's transparency is as much the art as its colour.
    for (let k = 0; k < 4; k++) if (a[i + k] !== b[i + k]) n++;
  }
  return n;
}

async function encode(buf) {
  /* exact:true stops libwebp rewriting the RGB under fully-transparent pixels.
     It normally treats those as free space to compress into, since nothing
     renders them - but "nothing renders them" stops being true the moment a
     sprite is drawn with linear filtering, where neighbouring texels bleed into
     the visible edge and an invented colour becomes a dark fringe. It costs
     about 1.8% in size and removes the question entirely. */
  const out = await sharp(buf).webp({ lossless: true, effort: 6, exact: true }).toBuffer();

  // Never take libwebp's word for it. This is the whole promise of the script -
  // if a file ever comes back altered, fail the run rather than ship it.
  const differing = await channelsDiffering(await sharp(buf).ensureAlpha().raw().toBuffer(), out);
  if (differing !== 0) {
    throw new Error(`lossless encode was not bit-exact (${differing} channel samples differ)`);
  }

  return { out, mode: 'lossless' };
}

/* One job per message; the parent sends the next only once this one is answered,
   so a worker is never more than one file ahead and memory stays flat. */
function runWorker() {
  parentPort.on('message', async ({ i, src, dest }) => {
    try {
      const buf = fs.readFileSync(src);
      const { out, mode } = await encode(buf);
      // A .webp that isn't smaller is just a second copy to ship.
      if (out.length >= buf.length) {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        parentPort.postMessage({ i, mode: 'skipped', srcLen: buf.length, outLen: 0 });
      } else {
        fs.writeFileSync(dest, out);
        parentPort.postMessage({ i, mode, srcLen: buf.length, outLen: out.length });
      }
    } catch (e) {
      parentPort.postMessage({ i, error: e.message });
    }
  });
}

function runPool(stale, onResult) {
  if (stale.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const n = Math.min(JOBS, stale.length);
    let next = 0;
    let live = n;
    const feed = (w) => {
      if (next >= stale.length) { w.terminate(); return; }
      const i = next++;
      w.postMessage({ i, src: stale[i].src, dest: stale[i].dest });
    };
    for (let k = 0; k < n; k++) {
      const w = new Worker(__filename);
      w.on('message', (m) => { onResult(m); feed(w); });
      w.on('error', reject);
      w.on('exit', () => { if (--live === 0) resolve(); });
      feed(w);
    }
  });
}

/* Both foo.jpg and foo.png map to foo.webp, so whichever the walk reaches second
   silently overwrites the first and every player gets the wrong art with a 200 OK
   - no 404, so the loader's fallback to the original never fires. This shipped
   once already: tiles/fire.png (dead since the Spring Update) clobbered the webp
   for tiles/fire.jpg and the game rendered the old lava. Refuse to run instead. */
function assertNoCollisions(files) {
  const byDest = new Map();
  for (const src of files) {
    const dest = src.replace(/\.(png|jpe?g)$/i, '.webp');
    if (!byDest.has(dest)) byDest.set(dest, []);
    byDest.get(dest).push(src);
  }
  const clashes = [...byDest].filter(([, srcs]) => srcs.length > 1);
  if (!clashes.length) return;
  console.error('Two source images map to the same .webp name. Rename or delete one of each pair:\n');
  for (const [dest, srcs] of clashes) {
    console.error(`  ${rel(dest)}  <-  ${srcs.map((s) => path.basename(s)).join('  +  ')}`);
  }
  console.error('');
  process.exit(1);
}

function readManifest() {
  try {
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    return m.policy === POLICY ? m.files || {} : {};
  } catch (e) {
    return {};
  }
}

(async () => {
  if (isWorker) return runWorker();

  const files = walk(ASSETS);
  assertNoCollisions(files);

  const manifest = readManifest();
  const entries = files.map((src) => ({
    src,
    dest: src.replace(/\.(png|jpe?g)$/i, '.webp'),
    key: rel(src),
    hash: sha(fs.readFileSync(src)),
  }));

  const stale = entries.filter(({ dest, key, hash }) => {
    if (force) return true;
    const prev = manifest[key];
    if (!prev || prev.hash !== hash) return true;
    // Manifest says "no webp for this one" and there is none - that is current.
    return prev.mode === 'skipped' ? fs.existsSync(dest) : !fs.existsSync(dest);
  });

  if (checkOnly) {
    if (stale.length) {
      console.error(`${stale.length} asset(s) need re-converting. Run: node scripts/webp.js`);
      for (const s of stale.slice(0, 20)) console.error('  ' + s.key);
      process.exit(1);
    }
    console.log(`All ${files.length} assets have up-to-date .webp files.`);
    return;
  }

  console.log(`${files.length} source images, ${stale.length} to convert on ${JOBS} workers.\n`);
  const writeManifest = () => fs.writeFileSync(MANIFEST, JSON.stringify({ policy: POLICY, files: manifest }, null, 1) + '\n');
  let before = 0;
  let after = 0;
  let skipped = 0;
  let done = 0;
  const modes = {};

  const failures = [];
  await runPool(stale, ({ i, mode, srcLen, outLen, error }) => {
    const { key, hash } = stale[i];
    if (error) {
      failures.push(`${key}: ${error}`);
    } else if (mode === 'skipped') {
      manifest[key] = { hash, mode: 'skipped' };
      skipped++;
    } else {
      manifest[key] = { hash, mode };
      before += srcLen;
      after += outLen;
      modes[mode] = (modes[mode] || 0) + 1;
    }
    // Checkpoint, so an interrupted run resumes instead of starting over.
    if (++done % 100 === 0 || done === stale.length) { writeManifest(); console.log(`  ${done}/${stale.length}`); }
  });

  if (failures.length) {
    console.error(`\n${failures.length} file(s) failed to convert:`);
    for (const f of failures.slice(0, 20)) console.error('  ' + f);
  }

  // Drop manifest rows for sources that no longer exist, and sweep the .webp they
  // left behind - otherwise a deleted foo.png keeps serving a stale foo.webp.
  const live = new Set(entries.map((e) => e.key));
  for (const key of Object.keys(manifest)) {
    if (live.has(key)) continue;
    const orphan = path.join(ASSETS, key).replace(/\.(png|jpe?g)$/i, '.webp');
    if (fs.existsSync(orphan)) { fs.unlinkSync(orphan); console.log(`removed orphan ${rel(orphan)}`); }
    delete manifest[key];
  }
  writeManifest();

  const MB = (x) => (x / 1048576).toFixed(2) + ' MB';
  console.log('\nencoders:', modes);
  console.log(`kept as original (webp was bigger): ${skipped}`);
  console.log(`${MB(before)} -> ${MB(after)}` + (before ? `  (${(100 - (after / before) * 100).toFixed(0)}% smaller)` : ''));
  if (failures.length) process.exit(1);
})();
