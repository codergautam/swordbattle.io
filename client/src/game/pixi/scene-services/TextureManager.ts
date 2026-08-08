import { Texture, BaseTexture, RenderTexture, SCALE_MODES } from 'pixi.js-legacy';

export class ShimTexture {
  key: string;
  pixi: Texture;
  private _source: HTMLImageElement | HTMLCanvasElement | null;
  private _canvas: HTMLCanvasElement | null;

  constructor(key: string, pixi: Texture, source: HTMLImageElement | HTMLCanvasElement | null, canvas: HTMLCanvasElement | null = null) {
    this.key = key;
    this.pixi = pixi;
    this._source = source;
    this._canvas = canvas;
    (pixi as any).key = key;
  }

  getSourceImage(): HTMLImageElement | HTMLCanvasElement | null { return this._source || this._canvas; }
  getContext(): CanvasRenderingContext2D | null { return this._canvas ? this._canvas.getContext('2d') : null; }
  refresh(): void { if (this.pixi && this.pixi.baseTexture) this.pixi.baseTexture.update(); }
}

export class TextureManager {
  private _map = new Map<string, ShimTexture>();
  private _missingTex: ShimTexture | null = null;
  private _rtPool = new Map<string, RenderTexture[]>();
  private _rtFifo: RenderTexture[] = [];
  private static poolCap = 6;
  private static poolGlobalCap = 64;
  scaleMode: number;

  constructor(antialias: boolean) {
    this.scaleMode = antialias ? SCALE_MODES.LINEAR : SCALE_MODES.NEAREST;
    BaseTexture.defaultOptions.scaleMode = this.scaleMode;
    this._createBuiltins();
  }

  private _createBuiltins(): void {
    const w = document.createElement('canvas');
    w.width = 4; w.height = 4;
    const wc = w.getContext('2d');
    if (wc) { wc.fillStyle = '#ffffff'; wc.fillRect(0, 0, 4, 4); }
    this.addCanvas('__WHITE', w);
    const d = document.createElement('canvas');
    d.width = 32; d.height = 32;
    this.addCanvas('__DEFAULT', d);
  }

  private static _rtKey(w: number, h: number, res: number): string {
    return Math.round(w) + '_' + Math.round(h) + '_' + res;
  }

  private _poolRT(rt: RenderTexture): void {
    try {
      (rt as any).__cooledAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const key = TextureManager._rtKey(rt.width, rt.height, rt.baseTexture.resolution);
      let bucket = this._rtPool.get(key);
      if (!bucket) { bucket = []; this._rtPool.set(key, bucket); }
      if (bucket.length >= TextureManager.poolCap) { rt.destroy(true); return; }
      while (this._rtFifo.length >= TextureManager.poolGlobalCap) {
        const old = this._rtFifo.shift();
        if (!old) break;
        const ob = this._rtPool.get(TextureManager._rtKey(old.width, old.height, old.baseTexture.resolution));
        if (ob) { const i = ob.indexOf(old); if (i >= 0) ob.splice(i, 1); }
        try { old.destroy(true); } catch (e) {}
      }
      bucket.push(rt);
      this._rtFifo.push(rt);
    } catch (e) { try { rt.destroy(true); } catch (e2) {} }
  }

  private static rtCooldownMs = 150;
  takeRenderTexture(w: number, h: number, res: number): RenderTexture | null {
    const key = TextureManager._rtKey(w, h, res);
    const bucket = this._rtPool.get(key);
    if (!bucket || !bucket.length) return null;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let idx = -1;
    for (let i = bucket.length - 1; i >= 0; i--) {
      const cooled = (bucket[i] as any).__cooledAt;
      if (cooled === undefined || now - cooled >= TextureManager.rtCooldownMs) { idx = i; break; }
    }
    if (idx < 0) return null;
    const rt = bucket.splice(idx, 1)[0] as RenderTexture;
    if (bucket.length === 0) this._rtPool.delete(key);
    const i = this._rtFifo.indexOf(rt);
    if (i >= 0) this._rtFifo.splice(i, 1);
    return rt;
  }

  private _freeTexture(t: ShimTexture): void {
    const pixi: any = t.pixi;
    if (pixi instanceof RenderTexture) this._poolRT(pixi);
    else if (pixi) { try { pixi.destroy(true); } catch (e) {} }
  }

  private _evict(key: string, keep?: Texture): void {
    const prev = this._map.get(key);
    if (prev && prev.pixi && prev.pixi !== keep) this._freeTexture(prev);
  }

  exists(key: string): boolean { return this._map.has(key); }

  get(key: string): ShimTexture {
    const t = this._map.get(key);
    return t || this._missing();
  }

  getPixi(key: string): Texture {
    const t = this._map.get(key);
    return t ? t.pixi : this._missing().pixi;
  }

  remove(key: string): void {
    const t = this._map.get(key);
    if (t) { this._freeTexture(t); this._map.delete(key); }
  }

  addImage(key: string, img: HTMLImageElement): ShimTexture {
    const base = BaseTexture.from(img, { scaleMode: this.scaleMode });
    const tex = new Texture(base);
    this._evict(key, tex);
    (tex as any).textureCacheIds = [key];
    const st = new ShimTexture(key, tex, img, null);
    this._map.set(key, st);
    return st;
  }

  addCanvas(key: string, canvas: HTMLCanvasElement): ShimTexture {
    const base = BaseTexture.from(canvas, { scaleMode: this.scaleMode });
    const tex = new Texture(base);
    this._evict(key, tex);
    (tex as any).textureCacheIds = [key];
    const st = new ShimTexture(key, tex, null, canvas);
    this._map.set(key, st);
    return st;
  }

  createCanvas(key: string, width: number, height: number): ShimTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return this.addCanvas(key, canvas);
  }

  addTexture(key: string, tex: Texture): ShimTexture {
    this._evict(key, tex);
    (tex as any).textureCacheIds = [key];
    const st = new ShimTexture(key, tex, null, null);
    this._map.set(key, st);
    return st;
  }

  private _missing(): ShimTexture {
    if (!this._missingTex) this._missingTex = new ShimTexture('__MISSING', Texture.EMPTY, null, null);
    return this._missingTex;
  }
}
