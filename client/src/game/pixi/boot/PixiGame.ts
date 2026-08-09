import { Application, utils, Rectangle, TextMetrics, Sprite as PixiSprite, Texture as PixiTexture } from 'pixi.js-legacy';
import { screenEffectsRuntime } from '../../effects/screenEffectsState';
import { detectWebGLQuality } from './webglQuality';
import settingsManager, { Settings } from '../../Settings';
import { Container } from '../display';
import { perfCounters } from '../display/Graphics';
import { TimeStep } from './TimeStep';
import { ScaleManager } from './ScaleManager';
import { Device } from './Device';
import { SceneManager } from './SceneManager';
import { ScreenFilter } from '../effects/ScreenFilter';

function rendererOverride(): 'webgl' | 'canvas' | null {
  try {
    const v = (new URLSearchParams(window.location.search).get('renderer') || '').toLowerCase();
    if (v === 'canvas') return 'canvas';
    if (v === 'webgl') return 'webgl';
  } catch (e) {}
  return null;
}

export class Game {
  app: Application;
  events: any = new utils.EventEmitter();
  loop: TimeStep;
  scale: ScaleManager;
  device = new Device();
  canvas: HTMLCanvasElement;
  renderer: any;
  scene: SceneManager;
  antialias: boolean;
  config: any;

  worldRoot: Container;
  fixedRoot: Container;
  hudRoot: Container;
  fxRoot!: Container;
  screenFilter: ScreenFilter | null = null;
  private fxOn = false;
  private fxArea = new Rectangle();
  private fxNeutralFrames = 999;

  private failed = false;
  isCanvasMode = false;
  private destroyed = false;
  private onContextLost: ((e: Event) => void) | null = null;
  private onContextRestored: (() => void) | null = null;

  constructor(config: any) {
    this.config = config || {};
    this.antialias = this.config.antialias !== false;
    (window as any).phaser_game = this;

    let explicitUseWebGL: boolean | undefined;
    try { explicitUseWebGL = settingsManager.get().useWebGL; } catch (e) {}

    if (explicitUseWebGL !== false) {
      try {
        localStorage.removeItem('swordbattle:webgl_slow');
        localStorage.removeItem('swordbattle:webgl_failed');
        localStorage.removeItem('swordbattle:webgl_failed_at');
        localStorage.removeItem('swordbattle:webgl_lost_count');
        localStorage.removeItem('swordbattle:webgl_lost_at');
      } catch (e) {}
      try { sessionStorage.removeItem('swordbattle:canvasThisSession'); } catch (e) {}
    }

    let compatRequested = false;
    let compatReason = '';
    const override = rendererOverride();
    try {
      if (override === 'canvas') {
        compatRequested = true;
        compatReason = '?renderer=canvas override';
      } else if (explicitUseWebGL === false) {
        compatRequested = true; compatReason = 'user setting';
      } else if (override !== 'webgl' && detectWebGLQuality() === 'none') {
        compatRequested = true; compatReason = 'no WebGL available';
      }
    } catch (e) {}
    if (compatRequested) console.log('[PixiGame] compatibility (canvas) mode selected:', compatReason);

    const baseOpts = {
      width: 1,
      height: 1,
      backgroundColor: 0x000000,
      backgroundAlpha: 1,
      antialias: this.antialias,
      powerPreference: this.config.powerPreference || 'default',
      resolution: 1,
      autoDensity: false,
      autoStart: false,
      eventMode: 'passive',
    };

    let app: Application | null = null;
    if (!compatRequested) {
      const attempts: any[] = [
        baseOpts,
        { ...baseOpts, antialias: false },
        { ...baseOpts, antialias: false, powerPreference: 'default', premultipliedAlpha: false },
        { ...baseOpts, antialias: false, powerPreference: 'low-power', backgroundAlpha: 1, preserveDrawingBuffer: false },
      ];
      for (let i = 0; i < attempts.length && !app; i++) {
        try {
          app = new Application(attempts[i]);
          if (i > 0) console.warn(`[PixiGame] WebGL started on fallback attempt ${i + 1}`);
        } catch (e) {
          console.error(`[PixiGame] WebGL init attempt ${i + 1}/${attempts.length} failed:`, e);
        }
      }
    }
    if (!app) {
      try {
        app = new Application({ ...baseOpts, forceCanvas: true } as any);
      } catch (e) {
        this.initFailed(e);
        return;
      }
    }
    this.app = app;
    this.isCanvasMode = !(this.app.renderer as any).gl;
    if (this.isCanvasMode) console.log('[PixiGame] running in compatibility (canvas) mode');
    (window as any).__rendererMode = this.isCanvasMode ? 'canvas' : 'webgl';
    this.canvas = this.app.view as unknown as HTMLCanvasElement;

    const parent = typeof this.config.parent === 'string'
      ? document.getElementById(this.config.parent)
      : this.config.parent;
    if (parent && this.canvas) parent.appendChild(this.canvas);

    if (this.canvas && !this.isCanvasMode) {
      this.onContextLost = (e: Event) => {
        if (this.destroyed) return;
        try { e.preventDefault(); } catch (err) {}
        if ((window as any).videoAdActive) return;
        this.showFatalOverlay('Graphics interrupted',
          "The game's graphics were interrupted (this can happen when your GPU is briefly overloaded), reload to keep playing",
          true);
      };
      this.onContextRestored = () => {
        if (this.destroyed) return;
        this.removeFatalOverlay();
      };
      this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
    }

    this.worldRoot = new Container(); this.worldRoot.sortableChildren = true;
    this.fixedRoot = new Container(); this.fixedRoot.sortableChildren = true;
    this.hudRoot = new Container(); this.hudRoot.sortableChildren = true;
    this.fxRoot = new Container();
    this.fxRoot.eventMode = 'passive';
    this.fxRoot.addChild(this.fixedRoot, this.worldRoot);
    this.app.stage.addChild(this.fxRoot, this.hudRoot);
    this.app.stage.eventMode = 'static';
    this.worldRoot.eventMode = 'none';
    this.worldRoot.interactiveChildren = false;
    this.hudRoot.eventMode = 'passive';
    try { (this.app.renderer as any).events.setTargetElement((this.app.view as any)); } catch (e) { /* noop */ }

    this.renderer = {
      type: this.isCanvasMode ? 1 : 2,
      pipelines: {
        getPostPipeline: () => null,
        addPostPipeline: () => {},
        removePostPipeline: () => {},
        get: () => null,
      },
    };

    this.scale = new ScaleManager(this.app.renderer as any, this.canvas);
    this.loop = new TimeStep(this.config);
    this.scene = new SceneManager(this, this.config.scene || []);

    void this._boot();
  }

  private initFailed(e: any): void {
    this.failed = true;
    console.error(
      '[PixiGame] Could not create a renderer (WebGL and canvas both failed). If this happened right '
      + 'after a crash or a "WebGL context lost" message, your browser GPU process is exhausted. '
      + 'RESTART THE BROWSER to recover it.', e);
    this.showFatalOverlay("Couldn't start the game",
      "Your browser couldn't start the game's graphics. Try reloading. If it keeps happening, close other "
      + 'tabs or apps using heavy graphics, or fully restart your browser.');
    this.canvas = null as any;
    this.scene = {
      getMain: () => null,
      getScene: () => ({ shutdown() {} }),
      isPaused: () => true, pause() {}, resume() {},
    } as any;
    this.loop = { destroy() {}, start() {}, sleep() {}, wake() {}, resetDelta() {}, hasFpsLimit: false, raf: {} } as any;
    this.scale = { resize() {}, setZoom() {}, width: 0, height: 0 } as any;
  }

  static disableWebGLAndReload(): void {
    try { Settings.useWebGL = false; } catch (e) { /* noop */ }
    try { localStorage.removeItem('swordbattle:WebGL'); } catch (e) { /* noop */ }
    try { (window as any).onbeforeunload = null; } catch (e) { /* noop */ }
    try { window.location.reload(); } catch (e) { /* noop */ }
  }

  private showFatalOverlay(title: string, message: string, offerCompatMode = false): void {
    if (typeof document === 'undefined' || document.getElementById('pixi-fatal-overlay')) return;
    const o = document.createElement('div');
    o.id = 'pixi-fatal-overlay';
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;'
      + 'justify-content:center;background:rgba(8,8,10,0.94);color:#fff;'
      + 'font-family:system-ui,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px;';
    const box = document.createElement('div');
    box.style.cssText = 'max-width:440px;';
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-size:26px;font-weight:700;margin-bottom:12px;';
    const p = document.createElement('div');
    p.textContent = message;
    p.style.cssText = 'font-size:16px;line-height:1.5;color:#cfcfd6;margin-bottom:22px;';
    const btn = document.createElement('button');
    btn.textContent = 'Reload';
    btn.style.cssText = 'font:inherit;font-size:17px;font-weight:700;color:#fff;background:#4f8fd6;'
      + 'border:3px solid #000;border-radius:10px;padding:10px 28px;cursor:pointer;';
    btn.onclick = () => { try { window.onbeforeunload = null; window.location.reload(); } catch (e) { /* noop */ } };
    box.appendChild(h); box.appendChild(p); box.appendChild(btn);
    if (offerCompatMode) {
      const compat = document.createElement('button');
      compat.textContent = 'Switch to compatibility mode';
      compat.style.cssText = 'display:block;margin:14px auto 0;font:inherit;font-size:14px;font-weight:700;'
        + 'color:#cfcfd6;background:transparent;border:2px solid #555;border-radius:8px;padding:8px 18px;cursor:pointer;';
      compat.onclick = () => { Game.disableWebGLAndReload(); };
      box.appendChild(compat);
    }
    o.appendChild(box);
    document.body.appendChild(o);
  }

  private removeFatalOverlay(): void {
    if (typeof document === 'undefined') return;
    const o = document.getElementById('pixi-fatal-overlay');
    if (o) o.remove();
  }

  setBackground(color: number): void {
    try { (this.app.renderer as any).background.color = color; } catch (e) { /* noop */ }
  }

  private blindOverlay: PixiSprite | null = null;
  private ensureBlindOverlay(): PixiSprite {
    if (this.blindOverlay) return this.blindOverlay;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 150);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const spr = new PixiSprite(PixiTexture.from(c));
    spr.visible = false;
    this.app.stage.addChildAt(spr, this.app.stage.getChildIndex(this.hudRoot as any));
    this.blindOverlay = spr;
    return spr;
  }

  private updateCanvasBlind(): void {
    const b = screenEffectsRuntime.blind || 0;
    if (b <= 0.001 && !this.blindOverlay) return;
    const o = this.ensureBlindOverlay();
    o.visible = b > 0.001;
    if (o.visible) {
      o.alpha = b;
      o.width = this.app.renderer.width;
      o.height = this.app.renderer.height;
    }
  }

  setScreenEffects(on: boolean): void {
    if (this.isCanvasMode) return;
    if (on === this.fxOn) return;
    this.fxOn = on;
    if (on && !this.screenFilter) {
      try { this.screenFilter = new ScreenFilter(); } catch (e) { this.screenFilter = null; this.fxOn = false; return; }
    }
    if (!on) { this.fxRoot.filters = null; this.fxNeutralFrames = 999; }
  }

  private async _boot(): Promise<void> {
    const scene = this.scene.getMain();
    scene._boot(this, { world: this.worldRoot, fixed: this.fixedRoot, hud: this.hudRoot });

    const w = (document.documentElement && document.documentElement.clientWidth) || 800;
    const h = (document.documentElement && document.documentElement.clientHeight) || 600;
    this.scale.resize(w, h);

    try {
      const fonts: any = (document as any).fonts;
      if (fonts && fonts.load) {
        await Promise.race([
          Promise.all([fonts.load("700 16px 'Saira'"), fonts.load("italic 700 16px 'Saira'")]),
          new Promise((res) => setTimeout(res, 2500)),
        ]);
      }
    } catch (e) {}
    try { TextMetrics.clearMetrics(); } catch (e) { /* noop */ }

    try {
      scene.init();
      scene.preload();
      await scene.load.start();
      scene.create();
    } catch (err) {
      console.error('[PixiGame] scene boot error:', err);
    }

    this.loop.start((time: number, delta: number) => this.step(time, delta));
  }

  private loggedErrors = new Set<string>();
  private logOnce(prefix: string, e: any): void {
    const msg = (e && e.message) ? e.message : String(e);
    if (this.loggedErrors.has(msg)) return;
    this.loggedErrors.add(msg);
    console.error(prefix, e);
  }

  private lastSlowLog = 0;
  private worstFrame = 0;
  private lastFrameEnd = 0;
  private perfEnabled = (() => { try { return window.location.search.includes('pixi'); } catch (e) { return false; } })();

  private cullMargin = 600;
  private cullFrame = 0;
  private cull(scene: any): void {
    const cam = scene.cameras && scene.cameras.main;
    if (!cam || !cam.worldView) return;
    const wv = cam.worldView;
    const m = this.cullMargin;
    const minX = wv.x - m, minY = wv.y - m;
    const maxX = wv.x + wv.width + m, maxY = wv.y + wv.height + m;
    const kids = this.worldRoot.children as any[];
    const frame = this.cullFrame++;
    for (let i = 0, n = kids.length; i < n; i++) {
      const c = kids[i];
      if (c._cullR === undefined || ((frame + i) % 90) === 0) {
        let r = 0;
        try {
          const lb = c.getLocalBounds();
          const t = c.transform && c.transform.scale;
          const sx = Math.abs(t ? t.x : 1), sy = Math.abs(t ? t.y : 1);
          const rx = Math.max(Math.abs(lb.x), Math.abs(lb.x + lb.width)) * sx;
          const ry = Math.max(Math.abs(lb.y), Math.abs(lb.y + lb.height)) * sy;
          r = Math.max(rx, ry);
        } catch (e) { r = 0; }
        c._cullR = (isFinite(r) && r > 0) ? r : 0;
      }
      const r = c._cullR;
      c.renderable = (c.x + r >= minX && c.x - r <= maxX && c.y + r >= minY && c.y - r <= maxY);
    }
  }

  private step(time: number, delta: number): void {
    const scene = this.scene.getMain();
    const perf = this.perfEnabled;
    if (perf) { perfCounters.genTex = 0; perfCounters.genTexPooled = 0; }
    const t0 = perf ? performance.now() : 0;
    const gap = (perf && this.lastFrameEnd) ? t0 - this.lastFrameEnd : 0;

    this.events.emit('prestep', time, delta);
    if (!this.scene.isPaused()) {
      try { scene.tweens.update(time, delta); } catch (e) { this.logOnce('[PixiGame] tween error:', e); }
    }
    const t1 = perf ? performance.now() : 0;
    if (!this.scene.isPaused()) {
      try { scene.update(time, delta); } catch (e) { this.logOnce('[PixiGame] update error:', e); }
      try { scene.particleManager.update(time, delta); } catch (e) { this.logOnce('[PixiGame] particle error:', e); }
    }
    const t2 = perf ? performance.now() : 0;
    try { scene.cameras.main.preRender(delta); } catch (e) { this.logOnce('[PixiGame] camera error:', e); }
    try { this.cull(scene); } catch (e) { this.logOnce('[PixiGame] cull error:', e); }
    if (this.isCanvasMode) {
      try { this.updateCanvasBlind(); } catch (e) { this.logOnce('[PixiGame] blind overlay error:', e); }
    }
    if (this.fxOn && this.screenFilter) {
      try {
        const rw = this.app.renderer.width, rh = this.app.renderer.height;
        this.fxArea.x = 0; this.fxArea.y = 0; this.fxArea.width = rw; this.fxArea.height = rh;
        this.fxRoot.filterArea = this.fxArea;
        const active = this.screenFilter.update((this.loop && this.loop.time) || 0, rw, rh);
        this.fxNeutralFrames = active ? 0 : this.fxNeutralFrames + 1;
        const want = this.fxNeutralFrames < 20;
        const attached = !!(this.fxRoot.filters && this.fxRoot.filters.length);
        if (want !== attached) this.fxRoot.filters = want ? [this.screenFilter as any] : null;
      } catch (e) { this.logOnce('[PixiGame] screenFX error:', e); }
    }
    this.events.emit('prerender');
    try { this.app.render(); } catch (e) { this.logOnce('[PixiGame] render error:', e); }
    this.events.emit('poststep', time, delta);
    this.events.emit('postrender');

    if (perf) {
      const t3 = performance.now();
      const total = t3 - t0;
      if (total > this.worstFrame) this.worstFrame = total;
      if ((total > 18 || gap > 18) && t3 - this.lastSlowLog > 250) {
        this.lastSlowLog = t3;
        const heap = (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : -1;
        const gt = perfCounters.genTex, gtp = perfCounters.genTexPooled;
        console.warn(
          `[pixi-spike] frame=${total.toFixed(1)}ms gap=${gap.toFixed(1)}ms  tween=${(t1 - t0).toFixed(1)} `
          + `update=${(t2 - t1).toFixed(1)} render=${(t3 - t2).toFixed(1)}  | genTex=${gt}(pool ${gtp}) `
          + `tweens=${scene.tweens.count?.() ?? '?'} world=${this.worldRoot.children.length} hud=${this.hudRoot.children.length}`
          + (heap >= 0 ? ` heap=${heap}MB` : ''),
        );
      }
      this.lastFrameEnd = t3;
    }
  }

  destroy(removeCanvas: boolean): void {
    this.destroyed = true;
    try {
      if (this.canvas && this.onContextLost) this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
      if (this.canvas && this.onContextRestored) this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored, false);
    } catch (e) {}
    this.onContextLost = null;
    this.onContextRestored = null;

    if (this.failed) { if ((window as any).phaser_game === this) (window as any).phaser_game = null; return; }
    try { this.loop.destroy(); } catch (e) { /* noop */ }
    try {
      const scene = this.scene.getMain();
      if (scene && typeof scene.shutdown === 'function') scene.shutdown();
      if (scene && scene.input && typeof scene.input.destroy === 'function') scene.input.destroy();
      if (scene && scene.sound && typeof scene.sound.destroy === 'function') scene.sound.destroy();
    } catch (e) { /* noop */ }
    try { this.app.destroy(removeCanvas, { children: true, texture: false, baseTexture: false }); } catch (e) { /* noop */ }
    if ((window as any).phaser_game === this) (window as any).phaser_game = null;
  }
}
