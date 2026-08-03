import { TilingSprite as PixiTilingSprite, Texture } from 'pixi.js';
import { applyPhaserGO } from './mixin';

const PhaserTileBase = applyPhaserGO(PixiTilingSprite);

export class TileSprite extends PhaserTileBase {
  private _sizeW: number;
  private _sizeH: number;
  private _dispW: number;
  private _dispH: number;
  private _dispSet = false;
  private _tsx = 1;
  private _tsy = 1;
  private _tpx = 0;
  private _tpy = 0;

  constructor(x = 0, y = 0, width = 0, height = 0, texture?: Texture) {
    super(texture ?? Texture.WHITE, width || 1, height || 1);
    this.anchor.set(0.5, 0.5);
    this.transform.position.set(x, y);
    this._sizeW = width; this._sizeH = height;
    this._dispW = width; this._dispH = height;
    this._recompute();
  }

  setOrigin(ox = 0.5, oy = ox): this { this.anchor.set(ox, oy); return this; }

  setSize(w: number, h: number): this {
    this._sizeW = w; this._sizeH = h;
    if (!this._dispSet) { this._dispW = w; this._dispH = h; }
    this._recompute();
    return this;
  }
  setDisplaySize(w: number, h: number): this {
    this._dispW = w; this._dispH = h; this._dispSet = true;
    this._recompute();
    return this;
  }
  setTileScale(x: number, y = x): this { this._tsx = x; this._tsy = y; this._recompute(); return this; }
  setTilePosition(x: number, y: number): this { this._tpx = x; this._tpy = y; this._recompute(); return this; }
  setTexture(texture: Texture | string): this {
    if (typeof texture === 'string') {
      this._texKey = texture;
      const tm = this._scene && this._scene.textures;
      if (tm) this.texture = tm.getPixi(texture);
    } else {
      this.texture = texture;
    }
    this._recompute();
    return this;
  }

  private _recompute(): void {
    this.width = this._dispW;
    this.height = this._dispH;
    const kx = this._sizeW ? this._dispW / this._sizeW : 1;
    const ky = this._sizeH ? this._dispH / this._sizeH : 1;
    const tsx = this._tsx * kx;
    const tsy = this._tsy * ky;
    this.tileScale.set(tsx, tsy);
    const texW = this.texture ? this.texture.width : 0;
    const texH = this.texture ? this.texture.height : 0;
    const periodX = tsx * texW;
    const periodY = tsy * texH;
    let px = -this._tpx * tsx;
    let py = -this._tpy * tsy;
    if (periodX) px = ((px % periodX) + periodX) % periodX;
    if (periodY) py = ((py % periodY) + periodY) % periodY;
    this.tilePosition.set(px, py);
  }
}
