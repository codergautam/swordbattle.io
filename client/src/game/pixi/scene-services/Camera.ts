import { Container } from 'pixi.js';
import * as mathgeom from '../mathgeom';

export interface Viewport { width: number; height: number; }

const linear = (v: number): number => v;
function resolveEase(e: any): (v: number) => number { return typeof e === 'function' ? e : linear; }

interface PanEffect { active: boolean; duration: number; elapsed: number; ease: (v: number) => number; cb: any; sx: number; sy: number; dx: number; dy: number; }
interface ZoomEffect { active: boolean; duration: number; elapsed: number; ease: (v: number) => number; cb: any; from: number; to: number; }

export class Camera {
  scrollX = 0;
  scrollY = 0;
  zoom = 1;
  rotation = 0;
  roundPixels = true;
  x = 0;
  y = 0;
  originX = 0.5;
  originY = 0.5;
  visible = true;
  alpha = 1;

  worldView: any = new mathgeom.Geom.Rectangle(0, 0, 0, 0);
  midPoint: any = new mathgeom.Math.Vector2(0, 0);

  mouseOffsetX = 0;
  mouseOffsetY = 0;

  private _worldRoot: Container;
  private _fixedRoot: Container | null;
  private _getViewport: () => Viewport;
  private _setBackground: (color: number) => void;
  private _follow: any = null;
  private _panEffect: PanEffect | null = null;
  private _zoomEffect: ZoomEffect | null = null;

  constructor(worldRoot: Container, getViewport: () => Viewport, setBackground: (color: number) => void, fixedRoot?: Container) {
    this._worldRoot = worldRoot;
    this._getViewport = getViewport;
    this._setBackground = setBackground;
    this._fixedRoot = fixedRoot || null;
  }

  get width(): number { return this._getViewport().width; }
  get height(): number { return this._getViewport().height; }
  get displayWidth(): number { return this.width / this.zoom; }
  get displayHeight(): number { return this.height / this.zoom; }
  get centerX(): number { return this.width * 0.5; }
  get centerY(): number { return this.height * 0.5; }

  setZoom(value: number): this { this.zoom = value || 0.0001; return this; }
  setScroll(x: number, y: number): this { this.scrollX = x; this.scrollY = y; return this; }

  centerOn(x: number, y: number): this {
    this.scrollX = x - this.width * 0.5;
    this.scrollY = y - this.height * 0.5;
    this.midPoint.set(x, y);
    return this;
  }

  setBackgroundColor(color: string | number): this {
    const c = typeof color === 'string' ? (mathgeom.Display.Color.HexStringToColor(color).color as number) : color;
    this._setBackground(c);
    return this;
  }

  startFollow(target: any): this {
    this._follow = (target && !(target as any).destroyed && (target as any).transform) ? target : null;
    return this;
  }
  stopFollow(): this { this._follow = null; return this; }

  pan(x: number, y: number, duration = 1000, ease: any = linear, force = false, cb?: any): this {
    if (this._panEffect && this._panEffect.active && !force) return this;
    this._follow = null;
    this._panEffect = {
      active: true, duration: Math.max(duration || 0, 1), elapsed: 0, ease: resolveEase(ease), cb: cb || null,
      sx: this.scrollX + this.width * 0.5, sy: this.scrollY + this.height * 0.5, dx: x, dy: y,
    };
    return this;
  }

  zoomTo(zoom: number, duration = 1000, ease: any = linear, force = false, cb?: any): this {
    if (this._zoomEffect && this._zoomEffect.active && !force) return this;
    this._zoomEffect = {
      active: true, duration: Math.max(duration || 0, 1), elapsed: 0, ease: resolveEase(ease), cb: cb || null,
      from: this.zoom, to: zoom || 0.0001,
    };
    return this;
  }

  rescaleZoomEffect(factor: number): this {
    const ze = this._zoomEffect;
    if (ze && ze.active && factor > 0 && isFinite(factor)) {
      ze.from *= factor;
      ze.to *= factor;
    }
    return this;
  }

  onScreenFX: ((on: boolean) => void) | null = null;
  setPostPipeline(_pipeline?: any): this { if (this.onScreenFX) this.onScreenFX(true); return this; }
  resetPostPipeline(_all?: boolean): this { if (this.onScreenFX) this.onScreenFX(false); return this; }

  getWorldPoint(x: number, y: number, out?: any): any {
    const o = out || new mathgeom.Math.Vector2();
    const hw = this.width * 0.5;
    const hh = this.height * 0.5;
    o.x = this.scrollX + hw + (x - hw) / this.zoom;
    o.y = this.scrollY + hh + (y - hh) / this.zoom;
    return o;
  }

  advanceEffects(delta = 16.6667): void {
    const pe = this._panEffect;
    if (pe && pe.active) {
      pe.elapsed += delta;
      const p = pe.elapsed / pe.duration;
      if (p >= 1) {
        this.centerOn(pe.dx, pe.dy);
        pe.active = false; this._panEffect = null;
        if (pe.cb) pe.cb(this, 1, pe.dx, pe.dy);
      } else {
        const v = pe.ease(p);
        const cx = pe.sx + (pe.dx - pe.sx) * v;
        const cy = pe.sy + (pe.dy - pe.sy) * v;
        this.centerOn(cx, cy);
        if (pe.cb) pe.cb(this, p, cx, cy);
      }
    }

    const ze = this._zoomEffect;
    if (ze && ze.active) {
      ze.elapsed += delta;
      const p = ze.elapsed / ze.duration;
      if (p >= 1) {
        this.zoom = ze.to;
        ze.active = false; this._zoomEffect = null;
        if (ze.cb) ze.cb(this, 1, this.zoom);
      } else {
        const v = ze.ease(p);
        this.zoom = ze.from + (ze.to - ze.from) * v;
        if (ze.cb) ze.cb(this, p, this.zoom);
      }
    }
  }

  preRender(_delta = 16.6667): void {
    const w = this.width;
    const h = this.height;
    const hw = w * 0.5;
    const hh = h * 0.5;

    const f: any = this._follow;
    if (f) {
      if (f.destroyed || !f.transform) {
        this._follow = null;
      } else {
        this.scrollX = f.x - hw + this.mouseOffsetX;
        this.scrollY = f.y - hh + this.mouseOffsetY;
      }
    }

    const midX = this.scrollX + hw;
    const midY = this.scrollY + hh;
    this.midPoint.set(midX, midY);

    const dW = w / this.zoom;
    const dH = h / this.zoom;
    this.worldView.setTo(Math.floor(midX - dW / 2), Math.floor(midY - dH / 2), dW, dH);

    this._worldRoot.transform.scale.set(this.zoom, this.zoom);
    this._worldRoot.transform.position.set(hw - this.zoom * midX, hh - this.zoom * midY);

    if (this._fixedRoot) {
      this._fixedRoot.transform.scale.set(this.zoom, this.zoom);
      this._fixedRoot.transform.position.set(hw - this.zoom * hw, hh - this.zoom * hh);
    }
  }
}
