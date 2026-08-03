import { Rectangle } from 'pixi.js';
import { Container } from '../display';

export class SoundStub {
  mute = false;
  volume = 1;
  add(_key?: string, config?: any): any {
    const vol = config && config.volume != null ? config.volume : 1;
    return {
      play() { return true; }, stop() {}, pause() {}, resume() {},
      setVolume(_v: number) { return this; }, setRate() { return this; }, setSeek() { return this; },
      setDetune() { return this; }, setLoop() { return this; }, setMute() { return this; },
      destroy() {}, on() { return this; }, once() { return this; }, off() { return this; },
      isPlaying: false, isPaused: false, duration: 0, volume: vol,
    };
  }
  play() { return true; }
  stopAll() {} removeAll() {} pauseAll() {} resumeAll() {}
  setVolume(v: number): this { this.volume = v; return this; }
  setMute(m: boolean): this { this.mute = m; return this; }
}

export class TimeStub {
  now = 0;
  delayedCall(delay: number, callback: (...a: any[]) => void, args?: any[], scope?: any): any {
    const id = setTimeout(() => { try { callback.apply(scope, args || []); } catch (e) {} }, delay);
    return { remove() { clearTimeout(id); }, destroy() { clearTimeout(id); }, hasDispatched: false, getProgress() { return 0; } };
  }
  addEvent(config: any): any {
    const delay = config.delay || 0;
    const loop = !!config.loop || config.repeat === -1;
    const fire = () => { try { if (config.callback) config.callback.apply(config.callbackScope, config.args || []); } catch (e) {} };
    const handle: any = loop ? setInterval(fire, delay) : setTimeout(fire, delay);
    const clear = () => { if (loop) clearInterval(handle); else clearTimeout(handle); };
    return { remove: clear, destroy: clear, paused: false, getProgress() { return 0; } };
  }
  removeAllEvents() {}
  removeEvent() {}
}

export class PhysicsStub {
  world = {
    bounds: { x: 0, y: 0, width: 0, height: 0, setTo() {} },
    setBounds(x: number, y: number, w: number, h: number) {
      this.bounds.x = x; this.bounds.y = y; this.bounds.width = w; this.bounds.height = h; return this;
    },
    setBoundsCollision() {}, on() {}, step() {}, enable() {}, disable() {},
  };
  add = { existing(o: any) { return o; }, collider() { return {}; }, overlap() { return {}; } };
  pause() {} resume() {}
}

export class ScenePluginStub {
  private _makeSub: () => any;
  constructor(makeSub: () => any) { this._makeSub = makeSub; }
  add(_key?: string, _config?: any, _autoStart?: boolean): any { return this._makeSub(); }
  launch(): this { return this; } start(): this { return this; } stop(): this { return this; }
  pause(): this { return this; } resume(): this { return this; } sleep(): this { return this; } wake(): this { return this; }
  bringToTop(): this { return this; } sendToBack(): this { return this; }
  get(_key?: string): any { return null; } isActive(): boolean { return true; } isVisible(): boolean { return true; }
  setVisible(): this { return this; } remove(): this { return this; } run(): this { return this; }
}

const tweenReserved = [
  'targets', 'duration', 'ease', 'delay', 'yoyo', 'repeat', 'hold', 'onComplete', 'onUpdate',
  'onStart', 'onCompleteScope', 'onStartScope', 'onUpdateScope', 'completeDelay', 'repeatDelay',
  'paused', 'loop', 'flipX', 'flipY', 'callbackScope', 'props', 'from', 'to',
];

export class TweenManagerStub {
  add(config: any): any {
    const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
    for (const t of targets) {
      if (!t) continue;
      for (const k in config) {
        if (tweenReserved.indexOf(k) !== -1) continue;
        const v = config[k];
        try { (t as any)[k] = (v && typeof v === 'object' && 'to' in v) ? (v as any).to : v; } catch (e) {}
      }
    }
    if (typeof config.onComplete === 'function') { try { config.onComplete(); } catch (e) {} }
    return { stop() {}, remove() {}, pause() {}, play() {}, isPlaying() { return false; } };
  }
  addCounter(config: any): any {
    if (typeof config.onUpdate === 'function') {
      try { config.onUpdate({ getValue() { return config.to != null ? config.to : 0; } }); } catch (e) {}
    }
    if (typeof config.onComplete === 'function') { try { config.onComplete(); } catch (e) {} }
    return { stop() {}, remove() {} };
  }
  killTweensOf(_target: any): void {}
  killAll(): void {}
}

export class InputStub {
  activePointer = { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false, position: { x: 0, y: 0 } };
  pointer1 = this.activePointer;
  keyboard = {
    on() {}, off() {}, removeAllListeners() {},
    addKey() { return { on() {}, isDown: false, isUp: true }; },
    addKeys() { return {}; },
    createCursorKeys() { return {}; },
  };
  on(): this { return this; }
  off(): this { return this; }
  addPointer(): void {}
  setPollAlways(): void {}
  setGlobalTopOnly(): void {}
  setDefaultCursor(): void {}
}

export class RenderTextureStub extends Container {
  private _w: number;
  private _h: number;
  constructor(x = 0, y = 0, width = 32, height = 32) {
    super(x, y);
    this._w = width; this._h = height;
  }
  clear(): this { return this; }
  beginDraw(): this { return this; }
  batchDraw(): this { return this; }
  batchDrawFrame(): this { return this; }
  endDraw(): this { return this; }
  draw(): this { return this; }
  erase(): this { return this; }
  fill(): this { return this; }
  saveTexture(): any { return null; }
  setDisplaySize(): this { return this; }
  resize(width: number, height: number): this { this._w = width; this._h = height; return this; }
  get rtWidth(): number { return this._w; }
  get rtHeight(): number { return this._h; }
}

export class ZoneStub extends Container {
  _zw: number;
  _zh: number;
  _ox = 0.5;
  _oy = 0.5;
  constructor(x = 0, y = 0, width = 1, height = 1) {
    super(x, y);
    this._zw = width; this._zh = height;
    this.eventMode = 'static';
    this._updateHit();
  }
  setSize(w: number, h: number): this { this._zw = w; this._zh = h; this._updateHit(); return this; }
  setOrigin(ox = 0.5, oy = ox): this { this._ox = ox; this._oy = oy; this._updateHit(); return this; }
  _updateHit(): void {
    this.hitArea = new Rectangle(-this._zw * this._ox, -this._zh * this._oy, this._zw, this._zh);
  }
}
Object.defineProperty(ZoneStub.prototype, 'width', {
  configurable: true,
  get(this: any): number { return this._zw; },
  set(this: any, v: number) { this._zw = v; },
});
Object.defineProperty(ZoneStub.prototype, 'height', {
  configurable: true,
  get(this: any): number { return this._zh; },
  set(this: any, v: number) { this._zh = v; },
});

export class DomElementStub extends Container {
  node: HTMLElement;
  private _ox = 0.5;
  private _oy = 0.5;

  private static _hostEl: HTMLElement | null = null;
  private static _host(): HTMLElement | null {
    try {
      if (DomElementStub._hostEl && DomElementStub._hostEl.isConnected) return DomElementStub._hostEl;
      const el = document.createElement('div');
      el.id = 'pixi-dom-overlay';
      const st = el.style;
      st.position = 'fixed'; st.left = '0'; st.top = '0';
      st.width = '100%'; st.height = '100%';
      st.pointerEvents = 'none'; st.overflow = 'hidden';
      st.zIndex = '5';
      document.body.appendChild(el);
      DomElementStub._hostEl = el;
      return el;
    } catch (e) { return null; }
  }

  constructor(x = 0, y = 0, element?: any) {
    super(x, y);
    this.node = (element && element.nodeType) ? element
      : document.createElement(typeof element === 'string' ? element : 'div');
    try {
      const host = DomElementStub._host();
      if (host && this.node && !this.node.parentNode) host.appendChild(this.node);
      const st: any = this.node.style;
      st.position = 'absolute';
      st.pointerEvents = 'auto';
    } catch (e) {}
    this._syncDom();
  }

  _syncDom(): void {
    const n: any = this.node;
    if (!n || !n.style) return;
    let sx = 1, sy = 1;
    try {
      const sc: any = (this as any)._scene;
      const canvas = sc && sc.game && sc.game.canvas;
      const bw = sc && sc.scale ? sc.scale.width : 0;
      const bh = sc && sc.scale ? sc.scale.height : 0;
      if (canvas && bw && bh) {
        const r = canvas.getBoundingClientRect();
        if (r.width && r.height) { sx = r.width / bw; sy = r.height / bh; }
      }
    } catch (e) {}
    const a = (this as any)._domAlpha;
    const alpha = (typeof a === 'number') ? a : 1;
    n.style.left = (this.x * sx) + 'px';
    n.style.top = (this.y * sy) + 'px';
    n.style.transform = 'translate(' + (-this._ox * 100) + '%,' + (-this._oy * 100) + '%)';
    n.style.opacity = String(alpha);
    n.style.display = (this.visible !== false && alpha > 0.001) ? '' : 'none';
  }

  setOrigin(x = 0.5, y = x): this { this._ox = x; this._oy = y; this._syncDom(); return this; }
  setPosition(x = 0, y = x): this { super.setPosition(x, y); this._syncDom(); return this; }
  setVisible(v: boolean): this { super.setVisible(v); this._syncDom(); return this; }
  setText(text: string): this { if (this.node) this.node.textContent = text; return this; }
  getChildByID(id: string): any { return this.node ? this.node.querySelector('#' + id) : null; }
  getChildByName(name: string): any { return this.node ? this.node.querySelector('[name="' + name + '"]') : null; }
  addListener(): this { return this; }
  removeListener(): this { return this; }
  setElement(): this { return this; }
  createFromHTML(): this { return this; }
  destroy(fromScene?: boolean): void {
    try { if (this.node && this.node.parentNode) this.node.parentNode.removeChild(this.node); } catch (e) {}
    super.destroy(fromScene);
  }
}

Object.defineProperty(DomElementStub.prototype, 'alpha', {
  configurable: true,
  get(this: any): number { return typeof this._domAlpha === 'number' ? this._domAlpha : 1; },
  set(this: any, v: number) { this._domAlpha = v; if (this.node) this._syncDom(); },
});

export class ParticlesStub extends Container {
  createEmitter(_config?: any): any { return makeEmitterStub(); }
  createGravityWell(): any { return {}; }
}
function makeEmitterStub(): any {
  return {
    start() { return this; }, stop() { return this; }, explode() { return this; },
    setPosition() { return this; }, setSpeed() { return this; }, setScale() { return this; },
    setAlpha() { return this; }, setLifespan() { return this; }, setQuantity() { return this; },
    startFollow() { return this; }, stopFollow() { return this; }, remove() { return this; },
    on() { return this; }, setDepth() { return this; }, setBlendMode() { return this; },
  };
}
