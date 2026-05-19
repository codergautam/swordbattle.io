import Phaser from 'phaser';

type Phase = 'batch' | 'mask' | 'blend' | 'postfx' | 'shadowRT';
let phase: Phase = 'batch';

let enabled = false;
let patched = false;
let drawThisFrame = 0;
let fboThisFrame = 0;

const zero = (): Record<Phase, number> => ({ batch: 0, mask: 0, blend: 0, postfx: 0, shadowRT: 0 });
let flushByCause = zero();
let fboByCause = zero();
let realFboByCause = zero();
let peakDraws = 0, peakFlushSnap = zero();
let peakRealFbo = 0, peakFboSnap = zero(), peakRealSnap = zero();
let causeFrames = 0;

export const perfStats = {
  enabled: false,
  draws: 0,
  fbo: 0,
  maxDraws: 0,
  maxFbo: 0,
};

function wrap(proto: any, name: string, ph: Phase) {
  if (!proto || typeof proto[name] !== 'function') return;
  const orig = proto[name];
  proto[name] = function (this: any, ...a: any[]) {
    const prev = phase; phase = ph;
    try { return orig.apply(this, a); } finally { phase = prev; }
  };
}

export function initPerfStats(scene?: any) {
  try {
    enabled = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).has('perfstats');
  } catch (e) { enabled = false; }
  perfStats.enabled = enabled;
  if (!enabled || patched) return;
  patched = true;

  const p: any = Phaser;
  const pipelineProto = p?.Renderer?.WebGL?.WebGLPipeline?.prototype;
  const rendererProto = p?.Renderer?.WebGL?.WebGLRenderer?.prototype;

  if (pipelineProto && typeof pipelineProto.flush === 'function') {
    const origFlush = pipelineProto.flush;
    pipelineProto.flush = function patchedFlush(this: any, ...args: any[]) {
      if (this.vertexCount > 0) { drawThisFrame++; flushByCause[phase]++; }
      return origFlush.apply(this, args);
    };
  }
  if (rendererProto && typeof rendererProto.setFramebuffer === 'function') {
    const origSetFb = rendererProto.setFramebuffer;
    rendererProto.setFramebuffer = function patchedSetFb(this: any, framebuffer: any, ...rest: any[]) {
      if (framebuffer !== this.currentFramebuffer) { fboThisFrame++; fboByCause[phase]++; }
      return origSetFb.call(this, framebuffer, ...rest);
    };
  }

  const patchGl = (glProto: any) => {
    if (!glProto || glProto.__psPatched || typeof glProto.bindFramebuffer !== 'function') return;
    glProto.__psPatched = true;
    const orig = glProto.bindFramebuffer;
    glProto.bindFramebuffer = function (this: any, target: any, fb: any) {
      if (this.__psLastFb !== fb) { this.__psLastFb = fb; realFboByCause[phase]++; }
      return orig.call(this, target, fb);
    };
  };
  try {
    patchGl((window as any).WebGL2RenderingContext?.prototype);
    patchGl((window as any).WebGLRenderingContext?.prototype);
  } catch (e) {}

  const gm = p?.Display?.Masks?.GeometryMask?.prototype;
  wrap(gm, 'preRenderWebGL', 'mask');
  wrap(gm, 'postRenderWebGL', 'mask');
  wrap(rendererProto, 'setBlendMode', 'blend');
  const pm = p?.Renderer?.WebGL?.PipelineManager?.prototype;
  wrap(pm, 'preBatchCamera', 'postfx');
  wrap(pm, 'postBatchCamera', 'postfx');
  const rt = p?.GameObjects?.RenderTexture?.prototype;
  wrap(rt, 'beginDraw', 'shadowRT');
  wrap(rt, 'endDraw', 'shadowRT');

  installPhaseTimers(scene);

  console.log('[perfStats] enabled — draws + FBO/f bottom-left; per-cause split logs once/sec. INVARIANT: sum(flush split) === draws.');
}

// ── Frame-phase timing: split the WALL-CLOCK frame into update / RENDER / idle ─
// The game LOGIC is ~2.5ms, yet the frame is 20-33ms. This hooks Phaser's
// game-loop events to show WHERE the rest goes: scene update (game logic), the
// render (Phaser display-list walk + WebGL batch build — pure CPU/JS, scales
// with object count), and idle (vsync wait / browser / compositor). Definitively
// localizes the bottleneck. No-op unless ?perfstats.
let phaseInstalled = false;
let lastPrestep = 0;
let updateStart = 0;
let renderStart = 0;
let phaseUpdateMs = 0;
let phaseRenderMs = 0;
let phaseFrameMs = 0;
let phaseFrames = 0;

function installPhaseTimers(scene: any) {
  if (phaseInstalled || !enabled) return;
  const events = scene && scene.game && scene.game.events;
  if (!events || typeof events.on !== 'function') return;
  phaseInstalled = true;
  const P: any = Phaser;
  const E = (P && P.Core && P.Core.Events) || {};
  const PRE_STEP = E.PRE_STEP || 'prestep';
  const PRE_RENDER = E.PRE_RENDER || 'prerender';
  const POST_RENDER = E.POST_RENDER || 'postrender';
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  events.on(PRE_STEP, () => {
    const t = now();
    if (lastPrestep) { phaseFrameMs += t - lastPrestep; phaseFrames++; }
    lastPrestep = t;
    updateStart = t;
  });
  events.on(PRE_RENDER, () => {
    const t = now();
    phaseUpdateMs += t - updateStart;
    renderStart = t;
  });
  events.on(POST_RENDER, () => {
    phaseRenderMs += now() - renderStart;
  });
}

function flushPhaseTimers() {
  if (!phaseInstalled || phaseFrames <= 0) return;
  const f = phaseFrames;
  const upd = phaseUpdateMs / f;
  const ren = phaseRenderMs / f;
  const frame = phaseFrameMs / f;
  const idle = Math.max(0, frame - upd - ren);
  console.log(`[perfStats] FRAME ${frame.toFixed(1)}ms (~${(1000 / frame).toFixed(0)}fps) = update ${upd.toFixed(1)}ms + RENDER ${ren.toFixed(1)}ms + idle/vsync/browser ${idle.toFixed(1)}ms`);
  phaseUpdateMs = 0; phaseRenderMs = 0; phaseFrameMs = 0; phaseFrames = 0;
}

export function tickPerfStats() {
  if (!enabled) return;
  perfStats.draws = drawThisFrame;
  perfStats.fbo = fboThisFrame;
  if (drawThisFrame > perfStats.maxDraws) perfStats.maxDraws = drawThisFrame;
  if (fboThisFrame > perfStats.maxFbo) perfStats.maxFbo = fboThisFrame;

  const realTotal = (Object.values(realFboByCause) as number[]).reduce((a, b) => a + b, 0);
  if (drawThisFrame >= peakDraws) { peakDraws = drawThisFrame; peakFlushSnap = { ...flushByCause }; }
  if (realTotal >= peakRealFbo) { peakRealFbo = realTotal; peakFboSnap = { ...fboByCause }; peakRealSnap = { ...realFboByCause }; }

  if (++causeFrames >= 60) {
    console.log(
      `[perfStats] peak-draws frame = ${peakDraws} →`, { ...peakFlushSnap },
      `| peak-FBO frame: Phaser=${(Object.values(peakFboSnap) as number[]).reduce((a, b) => a + b, 0)} real=${peakRealFbo} →`,
      { phaser: { ...peakFboSnap }, real: { ...peakRealSnap } },
    );
    flushSectionTimers(causeFrames);
    flushPhaseTimers();
    peakDraws = 0; peakRealFbo = 0;
    peakFlushSnap = zero(); peakFboSnap = zero(); peakRealSnap = zero();
    causeFrames = 0;
  }

  drawThisFrame = 0;
  fboThisFrame = 0;
  flushByCause = zero();
  fboByCause = zero();
  realFboByCause = zero();
}

export function readPeakPerfStats() {
  const out = { draws: perfStats.maxDraws, fbo: perfStats.maxFbo };
  perfStats.maxDraws = 0;
  perfStats.maxFbo = 0;
  return out;
}

const sectionMs: Record<string, number> = {};

export function perfEnabled() { return enabled; }

export function perfMark(name?: string, start?: number): number {
  if (!enabled) return 0;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (name !== undefined && start !== undefined) {
    sectionMs[name] = (sectionMs[name] || 0) + (now - start);
  }
  return now;
}

function flushSectionTimers(frames: number) {
  if (!enabled || frames <= 0) return;
  const keys = Object.keys(sectionMs);
  if (keys.length === 0) return;
  const per: Record<string, string> = {};
  let total = 0;
  for (const k of keys) { total += sectionMs[k]; per[k] = (sectionMs[k] / frames).toFixed(2) + 'ms'; }
  console.log(`[perfStats] per-frame JS sections (avg over ${frames}f, sum=${(total / frames).toFixed(2)}ms):`, per);
  for (const k of keys) sectionMs[k] = 0;
}
