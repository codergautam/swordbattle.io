/* Converts public/assets images to .webp alongside the originals.
 *
 *   node scripts/webp.js          convert anything new or changed
 *   node scripts/webp.js --force  re-convert everything
 *   node scripts/webp.js --check  exit 1 if anything is stale (for CI)
 *
 * Quality is chosen per file: the cheapest setting whose alpha-weighted RMSE
 * against the original stays under RMSE_MAX. Transparent pixels are excluded
 * so alpha ringing doesn't fail an otherwise clean image. Originals are never
 * touched - the loader falls back to them if a .webp is missing.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'public', 'assets');
const RMSE_MAX = 5;
const QUALITIES = [85, 92, 97];

const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(p);
  }
  return out;
}

async function rmse(origBuf, webpBuf) {
  const [a, b] = await Promise.all([
    sharp(origBuf).ensureAlpha().raw().toBuffer(),
    sharp(webpBuf).ensureAlpha().raw().toBuffer(),
  ]);
  if (a.length !== b.length) return Infinity;
  let se = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] === 0) continue; // fully transparent - not visible
    for (let k = 0; k < 3; k++) {
      const d = a[i + k] - b[i + k];
      se += d * d;
      n++;
    }
  }
  return n ? Math.sqrt(se / n) : 0;
}

async function encode(buf) {
  const candidates = [];

  // Cheapest lossy setting that still looks identical, if any qualifies.
  for (const quality of QUALITIES) {
    const out = await sharp(buf).webp({ quality, alphaQuality: 100, effort: 5 }).toBuffer();
    if (await rmse(buf, out) <= RMSE_MAX) { candidates.push({ out, mode: `q${quality}` }); break; }
  }

  // Always weigh lossless too - on alpha-heavy sprites lossy WebP can come out
  // larger than the source PNG while lossless is several times smaller.
  candidates.push({ out: await sharp(buf).webp({ lossless: true, effort: 6 }).toBuffer(), mode: 'lossless' });

  candidates.sort((a, b) => a.out.length - b.out.length);
  return candidates[0];
}

(async () => {
  const files = walk(ASSETS);
  const stale = [];
  for (const src of files) {
    const dest = src.replace(/\.(png|jpe?g)$/i, '.webp');
    if (force || !fs.existsSync(dest) || fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs) stale.push({ src, dest });
  }

  if (checkOnly) {
    if (stale.length) {
      console.error(`${stale.length} asset(s) need re-converting. Run: node scripts/webp.js`);
      for (const s of stale.slice(0, 20)) console.error('  ' + path.relative(ASSETS, s.src));
      process.exit(1);
    }
    console.log(`All ${files.length} assets have up-to-date .webp files.`);
    return;
  }

  console.log(`${files.length} source images, ${stale.length} to convert.\n`);
  let before = 0;
  let after = 0;
  let skipped = 0;
  const modes = {};

  for (let i = 0; i < stale.length; i++) {
    const { src, dest } = stale[i];
    const buf = fs.readFileSync(src);
    const { out, mode } = await encode(buf);

    // A .webp that isn't smaller is just a second copy to ship.
    if (out.length >= buf.length) {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      skipped++;
    } else {
      fs.writeFileSync(dest, out);
      before += buf.length;
      after += out.length;
      modes[mode] = (modes[mode] || 0) + 1;
    }
    if ((i + 1) % 50 === 0 || i === stale.length - 1) {
      console.log(`  ${i + 1}/${stale.length}`);
    }
  }

  const MB = (x) => (x / 1048576).toFixed(2) + ' MB';
  console.log('\nencoders:', modes);
  console.log(`kept as original (webp was bigger): ${skipped}`);
  console.log(`${MB(before)} -> ${MB(after)}` + (before ? `  (${(100 - (after / before) * 100).toFixed(0)}% smaller)` : ''));
})();
