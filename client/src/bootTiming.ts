/* Boot-path timing. Values are ms since page navigation start.
   Enable with ?boottiming. Call __boot() in the console for the breakdown. */

/* console.log is stripped from production builds via terser pure_funcs
   (config/webpack.config.js). Going through an alias keeps these
   flag-gated tools usable in prod, where they are most needed. */
const out: (...a: any[]) => void = console.log.bind(console);


const enabled = typeof window !== 'undefined' && window.location.search.includes('boottiming');

const marks: Array<{ name: string; at: number }> = [];
const spans: Array<{ name: string; start: number; end: number; detail?: any }> = [];
const seen = new Set<string>();
const now = () => performance.now();

export const bootTimingEnabled = () => enabled;

export function mark(name: string, detail?: any): void {
  if (!enabled) return;
  marks.push({ name, at: now() });
  out(`[boot] ${now().toFixed(0).padStart(6)}ms  ${name}`, detail ?? '');
}

/* For marks inside React effects that re-run on every dependency change. */
export function markOnce(name: string): void {
  if (!enabled || seen.has(name)) return;
  seen.add(name);
  mark(name);
}

/* Returns the end function. */
export function span(name: string): (detail?: any) => void {
  if (!enabled) return () => {};
  const start = now();
  return (detail?: any) => spans.push({ name, start, end: now(), detail });
}

export function report(): void {
  if (!enabled) return;
  out('\n=== BOOT TIMELINE ===');
  let prev = 0;
  for (const m of marks.slice().sort((a, b) => a.at - b.at)) {
    out(`${m.at.toFixed(0).padStart(6)}ms  +${(m.at - prev).toFixed(0).padStart(5)}  ${m.name}`);
    prev = m.at;
  }

  out('\n=== SPANS (slowest first) ===');
  for (const s of spans.slice().sort((a, b) => (b.end - b.start) - (a.end - a.start))) {
    out(`${(s.end - s.start).toFixed(0).padStart(6)}ms  ${s.name}  [${s.start.toFixed(0)}->${s.end.toFixed(0)}]`, s.detail ?? '');
  }

  // The play button is an AND of three gates - name the one that finished last.
  const gates = marks.filter((m) => m.name.startsWith('gate:')).sort((a, b) => b.at - a.at);
  if (gates.length) {
    out('\n=== WHAT BLOCKED THE PLAY BUTTON ===');
    for (const g of gates) out(`${g.at.toFixed(0).padStart(6)}ms  ${g.name}`);
    out(`critical path: ${gates[0].name} (${(gates[0].at - gates[gates.length - 1].at).toFixed(0)}ms of pure idle waiting)`);
  }
}

export function reportOnce(): void {
  if (!enabled || seen.has('__reported')) return;
  seen.add('__reported');
  setTimeout(report, 0);
}

if (enabled) (window as any).__boot = report;
