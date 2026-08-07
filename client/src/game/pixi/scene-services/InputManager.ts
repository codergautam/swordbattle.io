import { utils } from 'pixi.js-legacy';

export interface Viewport { width: number; height: number; }

class Pointer {
  x = 0; y = 0; id = 0;
  button = 0;
  isDown = false;
  event: any = null;
  position = { x: 0, y: 0 };
  worldX = 0; worldY = 0;
  private wp = { x: 0, y: 0 };
  leftButtonDown(): boolean { return this.isDown && this.button === 0; }
  rightButtonDown(): boolean { return this.isDown && this.button === 2; }
  leftButtonReleased(): boolean { return !this.isDown && this.button === 0; }
  rightButtonReleased(): boolean { return !this.isDown && this.button === 2; }
  updateWorldPoint(camera: any): this {
    const p = camera.getWorldPoint(this.x, this.y, this.wp);
    this.worldX = p.x;
    this.worldY = p.y;
    return this;
  }
}

function codeToKey(code: string, key: string): string | null {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  if (code === 'Space') return 'SPACE';
  if (code.startsWith('Shift')) return 'SHIFT';
  if (code.startsWith('Control')) return 'CTRL';
  if (code.startsWith('Alt')) return 'ALT';
  if (code === 'Enter') return 'ENTER';
  if (code === 'Escape') return 'ESC';
  if (code === 'Tab') return 'TAB';
  if (code === 'Backspace') return 'BACKSPACE';
  return key ? key.toUpperCase() : null;
}

class KeyboardManager extends utils.EventEmitter {
  private _target: Window | Document;
  private down: (e: KeyboardEvent) => void;
  private up: (e: KeyboardEvent) => void;
  private reset: () => void;
  private visibility: () => void;
  private held = new Set<string>();

  constructor(target: Window | Document) {
    super();
    this._target = target;
    const typing = (): boolean => {
      const el: any = typeof document !== 'undefined' ? document.activeElement : null;
      if (!el) return false;
      const tag = (el.tagName || '').toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
    };
    this.down = (e: KeyboardEvent) => { if (typing()) { this.reset(); return; } const k = codeToKey(e.code, e.key); if (k) { this.held.add(k); this.emit('keydown-' + k, e); } };
    this.up = (e: KeyboardEvent) => { const k = codeToKey(e.code, e.key); if (k) { this.held.delete(k); this.emit('keyup-' + k, e); } };
    this.reset = () => {
      if (this.held.size === 0) return;
      const keys = Array.from(this.held);
      this.held.clear();
      const synth = { code: '', key: '', repeat: false, preventDefault() {}, stopPropagation() {} } as any;
      for (const k of keys) this.emit('keyup-' + k, synth);
    };
    this.visibility = () => { if (typeof document !== 'undefined' && document.hidden) this.reset(); };
    this._target.addEventListener('keydown', this.down as any);
    this._target.addEventListener('keyup', this.up as any);
    window.addEventListener('blur', this.reset);
    document.addEventListener('visibilitychange', this.visibility);
  }

  addKey(): any { return { on() {}, isDown: false, isUp: true }; }
  addKeys(): any { return {}; }
  createCursorKeys(): any { return {}; }
  destroy(): void {
    this._target.removeEventListener('keydown', this.down as any);
    this._target.removeEventListener('keyup', this.up as any);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('visibilitychange', this.visibility);
    this.held.clear();
    this.removeAllListeners();
  }
}

export class InputManager extends utils.EventEmitter {
  activePointer = new Pointer();
  pointer1 = this.activePointer;
  pointer2 = new Pointer();
  pointer3 = new Pointer();
  pointer4 = new Pointer();
  keyboard: KeyboardManager;

  private _canvas: HTMLCanvasElement;
  private _getViewport: () => Viewport;
  private detach: Array<() => void> = [];
  private pool: Pointer[];
  private byId = new Map<number, Pointer>();

  constructor(canvas: HTMLCanvasElement, getViewport: () => Viewport, keyboardTarget: Window | Document) {
    super();
    this._canvas = canvas;
    this._getViewport = getViewport;
    this.keyboard = new KeyboardManager(keyboardTarget);
    this.pool = [this.activePointer, this.pointer2, this.pointer3, this.pointer4];

    const resolve = (e: PointerEvent): Pointer | null => {
      const p = this.byId.get(e.pointerId);
      if (p) return p;
      return e.pointerType === 'touch' ? null : this.activePointer;
    };

    const move = (e: PointerEvent) => {
      const p = resolve(e);
      if (!p) return;
      this.toBacking(e, p);
      p.event = e;
      this.emit('pointermove', p);
    };
    const down = (e: PointerEvent) => {
      const p = this.acquire(e.pointerId);
      this.toBacking(e, p);
      p.event = e; p.id = e.pointerId;
      p.button = e.button; p.isDown = true;
      this.emit('pointerdown', p);
    };
    const up = (e: PointerEvent) => {
      const p = resolve(e);
      this.byId.delete(e.pointerId);
      if (!p) return;
      this.toBacking(e, p);
      p.event = e; p.button = e.button; p.isDown = false;
      this.emit('pointerup', p);
    };
    const cancel = (e: PointerEvent) => {
      const p = this.byId.get(e.pointerId);
      this.byId.delete(e.pointerId);
      if (!p) return;
      p.event = e; p.isDown = false;
      this.emit('pointerup', p);
    };
    const ctxmenu = (e: Event) => e.preventDefault();

    try { this._canvas.style.touchAction = 'none'; } catch (e) {}

    window.addEventListener('pointermove', move as any);
    this._canvas.addEventListener('pointerdown', down as any);
    window.addEventListener('pointerup', up as any);
    window.addEventListener('pointercancel', cancel as any);
    this._canvas.addEventListener('contextmenu', ctxmenu as any);
    this.detach.push(
      () => window.removeEventListener('pointermove', move as any),
      () => this._canvas.removeEventListener('pointerdown', down as any),
      () => window.removeEventListener('pointerup', up as any),
      () => window.removeEventListener('pointercancel', cancel as any),
      () => this._canvas.removeEventListener('contextmenu', ctxmenu as any),
    );
  }

  private acquire(id: number): Pointer {
    const existing = this.byId.get(id);
    if (existing) return existing;
    const used = new Set(this.byId.values());
    for (const p of this.pool) {
      if (!used.has(p)) { this.byId.set(id, p); return p; }
    }
    this.byId.set(id, this.pool[0]);
    return this.pool[0];
  }

  private toBacking(e: PointerEvent, p: Pointer): void {
    const rect = this._canvas.getBoundingClientRect();
    const vp = this._getViewport();
    const sx = rect.width ? vp.width / rect.width : 1;
    const sy = rect.height ? vp.height / rect.height : 1;
    p.x = (e.clientX - rect.left) * sx;
    p.y = (e.clientY - rect.top) * sy;
    p.position.x = p.x; p.position.y = p.y;
  }

  addPointer(): void {}
  setPollAlways(): void {}
  setGlobalTopOnly(): void {}
  setDefaultCursor(): void {}

  destroy(): void {
    for (const d of this.detach) { try { d(); } catch (e) {} }
    this.detach.length = 0;
    this.byId.clear();
    for (const p of this.pool) { p.isDown = false; p.id = 0; p.event = null; }
    this.keyboard.destroy();
    this.removeAllListeners();
  }
}
