/* Deep loader instrumentation. Prefix: [loaderdebug]
 *
 * Answers one question: when the loading screen sits there, WHAT is it doing?
 * Splits every asset into four phases so you can tell bandwidth apart from CPU:
 *
 *   queued   -> started    queue wait   (concurrency starvation - workers all busy)
 *   started  -> onload     net+decode   (download + browser image decode)
 *   onload   -> uploaded   texture      (BaseTexture creation, main thread)
 *   plus:                  progress cb  (React re-render triggered per file)
 *
 * On localhost net+decode collapses to ~0, so anything left is CPU and the
 * report will say so out loud.
 *
 * On by default. Disable with ?loaderdebug=off. Per-file spam with ?loaderdebug=verbose.
 * Call __loaderdebug() in the console to re-print at any time.
 */

type Phase = 'queued' | 'started' | 'onload' | 'uploaded' | 'done';

interface FileRec {
  key: string;
  url: string;
  kind: 'image' | 'audio';
  queued: number;
  started: number;
  onload: number;
  uploaded: number;
  done: number;
  ok: boolean;
  cacheHit: boolean;
  attempts: Array<{ n: number; url: string; at: number; failedAt?: number }>;
  wonAttempt: number;
  bytes: number;
  transferred: number;
  ttfb: number;
}

/* console.log is stripped from production builds via terser pure_funcs
   (config/webpack.config.js). Going through an alias keeps these
   flag-gated tools usable in prod, where they are most needed. */
const out: (...a: any[]) => void = console.log.bind(console);


let mode: 'off' | 'on' | 'verbose' = 'on';
try {
  const q = window.location.search;
  if (q.includes('loaderdebug=off')) mode = 'off';
  else if (q.includes('loaderdebug=verbose')) mode = 'verbose';
} catch (e) {}

const enabled = mode !== 'off';
const verbose = mode === 'verbose';
const now = () => performance.now();
const ms = (n: number) => (n < 0 ? '  -  ' : n.toFixed(0).padStart(5));

const files = new Map<string, FileRec>();
const marks: Array<{ name: string; at: number; detail?: any }> = [];
const longTasks: Array<{ at: number; dur: number }> = [];
const occupancy: Array<{ at: number; inflight: number }> = [];
let inflight = 0;
let progressEvents = 0;
let progressCbMs = 0;
let batchStart = 0;
let batchEnd = 0;
let reported = false;

export const loaderDebugEnabled = () => enabled;

export function ldLog(msg: string, ...rest: any[]): void {
  if (!enabled) return;
  out(`[loaderdebug] ${now().toFixed(0).padStart(6)}ms  ${msg}`, ...rest);
}

export function ldMark(name: string, detail?: any): void {
  if (!enabled) return;
  marks.push({ name, at: now(), detail });
  ldLog(name, detail ?? '');
}

/* Main-thread blocking anywhere - the smoking gun when bytes are already cheap. */
if (enabled && typeof PerformanceObserver !== 'undefined') {
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longTasks.push({ at: e.startTime, dur: e.duration });
    }).observe({ entryTypes: ['longtask'] });
  } catch (e) {}
}

export function ldBatchStart(imgCount: number, audioCount: number, concurrency: number): void {
  if (!enabled) return;
  batchStart = now();
  ldMark(`BATCH START  ${imgCount} images + ${audioCount} audio, concurrency=${concurrency}`);
}

export function ldBatchEnd(): void {
  if (!enabled) return;
  batchEnd = now();
  ldMark(`BATCH END    ${(batchEnd - batchStart).toFixed(0)}ms wall`);
}

export function ldQueued(key: string, url: string, kind: 'image' | 'audio'): void {
  if (!enabled) return;
  files.set(key, {
    key, url, kind,
    queued: now(), started: -1, onload: -1, uploaded: -1, done: -1,
    ok: false, cacheHit: false, attempts: [], wonAttempt: 0,
    bytes: 0, transferred: 0, ttfb: 0,
  });
}

function rec(key: string): FileRec | undefined { return files.get(key); }

export function ldStarted(key: string): void {
  const r = rec(key); if (!r) return;
  r.started = now();
  inflight++;
  occupancy.push({ at: r.started, inflight });
}

export function ldAttempt(key: string, n: number, url: string): void {
  const r = rec(key); if (!r) return;
  r.attempts.push({ n, url, at: now() });
  if (verbose) ldLog(`  attempt ${n}  ${key}  ${url}`);
}

export function ldAttemptFailed(key: string, n: number): void {
  const r = rec(key); if (!r) return;
  const a = r.attempts.find((x) => x.n === n && x.failedAt === undefined);
  if (a) a.failedAt = now();
  if (verbose) ldLog(`  attempt ${n} FAILED  ${key}`);
}

export function ldOnload(key: string, attemptNo: number): void {
  const r = rec(key); if (!r) return;
  r.onload = now();
  r.wonAttempt = attemptNo;
}

export function ldUploaded(key: string): void {
  const r = rec(key); if (!r) return;
  r.uploaded = now();
}

export function ldCacheHit(key: string): void {
  const r = rec(key); if (!r) return;
  r.cacheHit = true;
}

export function ldDone(key: string, ok: boolean): void {
  const r = rec(key); if (!r) return;
  r.done = now();
  r.ok = ok;
  if (r.started >= 0) { inflight--; occupancy.push({ at: r.done, inflight }); }
  if (verbose) {
    ldLog(`  done ${ok ? 'OK ' : 'ERR'} ${key}  wait=${ms(r.started - r.queued)} net=${ms(r.onload - r.started)} tex=${ms(r.uploaded - r.onload)}`);
  }
}

/* Wrap the per-file progress callback so we can see what the React re-render costs. */
export function ldProgress<T>(fn: () => T): T {
  if (!enabled) return fn();
  const t = now();
  try { return fn(); } finally { progressEvents++; progressCbMs += now() - t; }
}

/* Pull real network numbers out of Resource Timing: transferSize 0 == served from cache. */
function hydrateNetwork(): void {
  let entries: PerformanceResourceTiming[] = [];
  try { entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]; } catch (e) { return; }
  const byUrl = new Map<string, PerformanceResourceTiming>();
  for (const e of entries) byUrl.set(e.name.split('?')[0], e);
  for (const r of files.values()) {
    const won = r.attempts.find((a) => a.n === r.wonAttempt) || r.attempts[r.attempts.length - 1];
    if (!won) continue;
    const e = byUrl.get(won.url.split('?')[0]);
    if (!e) continue;
    r.bytes = e.decodedBodySize || e.encodedBodySize || 0;
    r.transferred = e.transferSize || 0;
    r.ttfb = e.responseStart && e.requestStart ? e.responseStart - e.requestStart : 0;
  }
}

function dirOf(url: string): string {
  const p = url.split('?')[0].split('/assets/')[1] || url;
  const parts = p.split('/');
  parts.pop();
  return parts.join('/') || '(root)';
}

const kb = (b: number) => (b / 1024).toFixed(0).padStart(6) + ' KB';

export function ldReport(): void {
  if (!enabled) return;
  hydrateNetwork();
  const all = Array.from(files.values());
  const loaded = all.filter((r) => r.done >= 0);
  if (!loaded.length) { out('[loaderdebug] no files tracked'); return; }

  const sum = (f: (r: FileRec) => number) => loaded.reduce((a, r) => a + Math.max(0, f(r)), 0);
  const wait = sum((r) => r.started - r.queued);
  const net = sum((r) => r.onload - r.started);
  const tex = sum((r) => r.uploaded - r.onload);
  const wall = batchEnd > batchStart ? batchEnd - batchStart : now() - batchStart;

  const L = (s: string) => out('[loaderdebug] ' + s);

  out('\n[loaderdebug] ==================== LOADER BREAKDOWN ====================');
  L(`files tracked      ${loaded.length}   (${loaded.filter((r) => !r.ok).length} failed, ${loaded.filter((r) => r.cacheHit).length} already-in-cache)`);
  L(`batch wall time    ${wall.toFixed(0)}ms`);
  L('');
  L('--- CPU vs NETWORK (summed across all files, so > wall time) ---');
  L(`queue wait         ${ms(wait)}ms   workers busy, file sat in queue`);
  L(`network + decode   ${ms(net)}ms   download + browser image decode`);
  L(`texture upload     ${ms(tex)}ms   BaseTexture creation (MAIN THREAD)`);
  L(`progress callbacks ${ms(progressCbMs)}ms   ${progressEvents} events (MAIN THREAD, React re-render)`);
  L('');
  L('--- REACT PROGRESS RE-RENDERS ---');
  L(`setLoadingProgress ${reactProgressEvents} calls over ${(reactLastAt - reactFirstAt).toFixed(0)}ms`);
  L(`distinct values    ${reactProgressDistinct}`);
  L(`wasted re-renders  ${reactProgressEvents - reactProgressDistinct}  (same integer, App re-rendered anyway)`);

  const probed = loaded.filter((r) => r.attempts.length > 0);
  const webpHit = probed.filter((r) => r.wonAttempt === 1);
  const webpMiss = probed.filter((r) => r.wonAttempt > 1);
  const wastedMs = webpMiss.reduce((total, r) => {
    const firstAttempt = r.attempts.find((attempt) => attempt.n === 1);
    return total + (firstAttempt?.failedAt ? firstAttempt.failedAt - firstAttempt.at : 0);
  }, 0);
  L('');
  L('--- LOSSLESS WEBP ---');
  L(`served as .webp    ${webpHit.length}`);
  L(`served as original ${webpMiss.length}`);
  L(`fallback time      ${wastedMs.toFixed(0)}ms summed`);
  if (webpMiss.length && verbose) {
    for (const r of webpMiss.slice(0, 20)) L(`   original: ${r.key}  ${r.url}`);
  }

  // --- concurrency -----------------------------------------------------------
  const peak = occupancy.reduce((a, o) => Math.max(a, o.inflight), 0);
  const stalls = occupancy.filter((o) => o.inflight === 0).length;
  L('');
  L('--- CONCURRENCY ---');
  L(`peak in-flight     ${peak}`);
  L(`drained to zero    ${stalls} times mid-batch (should be 1, at the end)`);
  // Real work only - queue wait is idle time and would inflate this.
  const parallelism = wall > 0 ? ((net + tex) / wall).toFixed(1) : '0';
  L(`effective parallel ${parallelism}x  of ${peak} slots  (well under peak = stalling, not bandwidth-bound)`);

  // --- long tasks ------------------------------------------------------------
  const inBatch = longTasks.filter((t) => t.at >= batchStart - 50 && t.at <= (batchEnd || now()) + 50);
  const longMs = inBatch.reduce((a, t) => a + t.dur, 0);
  L('');
  L('--- MAIN THREAD BLOCKING (longtask observer) ---');
  L(`blocking tasks     ${inBatch.length} totalling ${longMs.toFixed(0)}ms during the batch`);
  for (const t of inBatch.slice().sort((a, b) => b.dur - a.dur).slice(0, 8)) {
    L(`   ${ms(t.dur)}ms blocking task at ${t.at.toFixed(0)}ms`);
  }

  // --- slowest files ---------------------------------------------------------
  L('');
  L('--- 20 SLOWEST FILES (queued -> done) ---');
  L('  total   wait    net    tex    bytes   xfer  key');
  for (const r of loaded.slice().sort((a, b) => (b.done - b.queued) - (a.done - a.queued)).slice(0, 20)) {
    L(`${ms(r.done - r.queued)} ${ms(r.started - r.queued)} ${ms(r.onload - r.started)} ${ms(r.uploaded - r.onload)} ${kb(r.bytes)} ${kb(r.transferred)}  ${r.key}`);
  }

  // --- by directory ----------------------------------------------------------
  const dirs = new Map<string, { n: number; bytes: number; xfer: number; net: number; tex: number }>();
  for (const r of loaded) {
    const d = dirOf(r.url);
    const e = dirs.get(d) || { n: 0, bytes: 0, xfer: 0, net: 0, tex: 0 };
    e.n++; e.bytes += r.bytes; e.xfer += r.transferred;
    e.net += Math.max(0, r.onload - r.started);
    e.tex += Math.max(0, r.uploaded - r.onload);
    dirs.set(d, e);
  }
  L('');
  L('--- BY DIRECTORY (bytes on the wire) ---');
  L('  files    bytes    xfer    net    tex  dir');
  for (const [d, e] of Array.from(dirs.entries()).sort((a, b) => b[1].bytes - a[1].bytes)) {
    L(`${String(e.n).padStart(6)} ${kb(e.bytes)} ${kb(e.xfer)} ${ms(e.net)} ${ms(e.tex)}  ${d}`);
  }

  // --- verdict ---------------------------------------------------------------
  const totalBytes = sum((r) => r.bytes);
  const totalXfer = sum((r) => r.transferred);
  const cpu = tex + progressCbMs + longMs;
  L('');
  L('--- VERDICT ---');
  L(`bytes decoded      ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  L(`bytes over wire    ${(totalXfer / 1024 / 1024).toFixed(2)} MB  ${totalXfer < totalBytes * 0.1 ? '(mostly CACHED - reload with cache disabled for a true cold number)' : ''}`);
  L(`network-ish time   ${net.toFixed(0)}ms summed`);
  L(`cpu-ish time       ${cpu.toFixed(0)}ms  (texture ${tex.toFixed(0)} + progress ${progressCbMs.toFixed(0)} + blocking ${longMs.toFixed(0)})`);
  if (cpu > net) {
    L('>> CPU-BOUND. Shrinking files will NOT fix this. Look at texture upload,');
    L('>> the per-file progress re-render, and long tasks above.');
  } else {
    L('>> NETWORK-BOUND. Fewer/smaller files and fewer requests will help.');
  }
  out('[loaderdebug] ==========================================================\n');
}

/* React-side progress accounting. Every asset dispatches an event that setStates
   the whole App; only a fraction actually change the displayed integer. */
let reactProgressEvents = 0;
let reactProgressDistinct = 0;
let lastPct = -1;
let reactFirstAt = -1;
let reactLastAt = -1;

export function ldReactProgress(pct: number): void {
  if (!enabled) return;
  reactProgressEvents++;
  if (reactFirstAt < 0) reactFirstAt = now();
  reactLastAt = now();
  if (pct !== lastPct) { reactProgressDistinct++; lastPct = pct; }
}

/* Log an event plus the call site that produced it - for flags flipped from many places. */
export function ldTrace(name: string): void {
  if (!enabled) return;
  let site = '';
  try {
    const lines = (new Error().stack || '').split('\n');
    site = (lines[2] || lines[1] || '').trim().replace(/^at\s+/, '');
  } catch (e) {}
  ldLog(`${name}   <- ${site}`);
}

/* ---- the three-way play gate: assetsLoaded && isConnected && crazygamesAuthReady ---- */
const gates = new Map<string, number>();

export function ldGate(name: string): void {
  if (!enabled || gates.has(name)) return;
  gates.set(name, now());
  ldLog(`GATE OPEN   ${name}`);
}

export function ldGateSummary(): void {
  if (!enabled || !gates.size) return;
  const sorted = Array.from(gates.entries()).sort((a, b) => a[1] - b[1]);
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  out('\n[loaderdebug] ==================== PLAY GATE ====================');
  for (const [name, at] of sorted) {
    out(`[loaderdebug] ${at.toFixed(0).padStart(6)}ms  ${name}`);
  }
  out(`[loaderdebug] CRITICAL PATH: ${last[0]} - it landed ${(last[1] - first[1]).toFixed(0)}ms after ${first[0]}.`);
  out(`[loaderdebug] That gap is pure idle waiting. Fix ${last[0]} first; the other legs are already done.`);
  out('[loaderdebug] ===================================================\n');
}

export function ldReportOnce(): void {
  if (!enabled || reported) return;
  reported = true;
  setTimeout(ldReport, 0);
}

if (enabled) {
  (window as any).__loaderdebug = ldReport;
  (window as any).__loaderdebugFiles = files;
  out('[loaderdebug] active. ?loaderdebug=verbose for per-file, ?loaderdebug=off to silence. __loaderdebug() to re-print.');
}
