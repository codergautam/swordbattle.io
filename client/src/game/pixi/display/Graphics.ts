import { Graphics as PixiGraphics, Rectangle, Matrix, Transform } from 'pixi.js-legacy';
import { applyPhaserGO } from './mixin';

const tempTransform = new Transform();

export const perfCounters = { genTex: 0, genTexPooled: 0 };

const PhaserGraphicsBase = applyPhaserGO(PixiGraphics);

type PathOp =
  | { op: 'move'; x: number; y: number }
  | { op: 'line'; x: number; y: number }
  | { op: 'arc'; x: number; y: number; r: number; s: number; e: number; anti: boolean }
  | { op: 'close' };

export class GeometryMask {
  geometryMask: Graphics;
  constructor(g: Graphics) { this.geometryMask = g; }
  destroy(): void { try { this.geometryMask.destroy(); } catch (e) { } }
}

export class Graphics extends PhaserGraphicsBase {
  private _fillColor = 0xffffff;
  private _fillAlpha = 1;
  private _lineWidth = 0;
  private _lineColor = 0x000000;
  private _lineAlpha = 1;
  private _path: PathOp[] = [];

  fillStyle(color: number, alpha = 1): this { this._fillColor = color; this._fillAlpha = alpha; return this; }
  lineStyle(width: any = 0, color: any = 0x000000, alpha = 1): this {
    if (width && typeof width === 'object') {
      this._lineWidth = width.width || 0;
      this._lineColor = width.color != null ? width.color : 0x000000;
      this._lineAlpha = width.alpha != null ? width.alpha : 1;
    } else {
      this._lineWidth = width || 0; this._lineColor = color; this._lineAlpha = alpha;
    }
    return this;
  }
  clear(): this {
    super.clear();
    this._path.length = 0;
    return this;
  }

  private _applyLine(): void { super.lineStyle(this._lineWidth, this._lineColor, this._lineAlpha, 0.5, false); }
  private _resetLine(): void { super.lineStyle(0); }

  fillRect(x: number, y: number, w: number, h: number): this {
    super.lineStyle(0); super.beginFill(this._fillColor, this._fillAlpha); super.drawRect(x, y, w, h); super.endFill(); return this;
  }
  fillCircle(x: number, y: number, r: number): this {
    super.lineStyle(0); super.beginFill(this._fillColor, this._fillAlpha); super.drawCircle(x, y, r); super.endFill(); return this;
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, radius = 0): this {
    super.lineStyle(0); super.beginFill(this._fillColor, this._fillAlpha); super.drawRoundedRect(x, y, w, h, radius); super.endFill(); return this;
  }
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this {
    super.lineStyle(0); super.beginFill(this._fillColor, this._fillAlpha); super.drawPolygon([x0, y0, x1, y1, x2, y2]); super.endFill(); return this;
  }

  strokeRect(x: number, y: number, w: number, h: number): this {
    this._applyLine(); super.drawRect(x, y, w, h); this._resetLine(); return this;
  }
  strokeCircle(x: number, y: number, r: number): this {
    this._applyLine(); super.drawCircle(x, y, r); this._resetLine(); return this;
  }
  strokeRoundedRect(x: number, y: number, w: number, h: number, radius = 0): this {
    this._applyLine(); super.drawRoundedRect(x, y, w, h, radius); this._resetLine(); return this;
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number): this {
    this._applyLine(); super.moveTo(x1, y1); super.lineTo(x2, y2); this._resetLine(); return this;
  }

  beginPath(): this { this._path.length = 0; return this; }
  moveTo(x: number, y: number): this { this._path.push({ op: 'move', x, y }); return this; }
  lineTo(x: number, y: number): this { this._path.push({ op: 'line', x, y }); return this; }
  closePath(): this { this._path.push({ op: 'close' }); return this; }
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise = false): this {
    this._path.push({ op: 'arc', x, y, r: radius, s: startAngle, e: endAngle, anti: anticlockwise }); return this;
  }
  slice(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise = false): this {
    this._path.length = 0;
    this._path.push({ op: 'move', x, y });
    this._path.push({ op: 'arc', x, y, r: radius, s: startAngle, e: endAngle, anti: anticlockwise });
    return this;
  }

  private _replayPath(): void {
    for (const p of this._path) {
      if (p.op === 'move') super.moveTo(p.x, p.y);
      else if (p.op === 'line') super.lineTo(p.x, p.y);
      else if (p.op === 'arc') super.arc(p.x, p.y, p.r, p.s, p.e, p.anti);
      else super.closePath();
    }
  }
  fillPath(): this {
    super.lineStyle(0); super.beginFill(this._fillColor, this._fillAlpha); this._replayPath(); super.endFill(); return this;
  }
  strokePath(): this { this._applyLine(); this._replayPath(); this._resetLine(); return this; }

  fillPolygonWithHole(outer: number[], hole: number[]): this {
    super.lineStyle(0);
    super.beginFill(this._fillColor, this._fillAlpha);
    super.drawPolygon(outer);
    super.beginHole();
    super.drawPolygon(hole);
    super.endHole();
    super.endFill();
    return this;
  }

  createGeometryMask(): GeometryMask { return new GeometryMask(this); }

  generateTexture(key: string, width?: number, height?: number): any {
    const scene = this._scene;
    const app = scene && scene.game && scene.game.app;
    if (!app) throw new Error('[pixi-shim] Graphics.generateTexture called before scene/renderer wired');
    const cap = 4096;
    const sx = Math.abs((this.transform.scale && this.transform.scale.x) || 1) || 1;
    const sy = Math.abs((this.transform.scale && this.transform.scale.y) || 1) || 1;
    const res = Math.max(sx, sy);
    let region: Rectangle;
    if (width && height) {
      region = new Rectangle(0, 0, Math.min(width, cap) / sx, Math.min(height, cap) / sy);
    } else {
      const b = this.getLocalBounds();
      const w = Math.min(Math.max(1, Math.ceil(b.width)), cap);
      const h = Math.min(Math.max(1, Math.ceil(b.height)), cap);
      region = new Rectangle(b.x, b.y, w, h);
    }

    perfCounters.genTex++;
    const pooled = scene.textures.takeRenderTexture(region.width, region.height, res);
    let rt: any;
    if (pooled) {
      perfCounters.genTexPooled++;
      const m = new Matrix();
      m.tx = -region.x; m.ty = -region.y;
      const saved = this.transform;
      (this as any).transform = tempTransform;
      try {
        app.renderer.render(this, { renderTexture: pooled, transform: m, skipUpdateTransform: !!this.parent, clear: true });
      } finally {
        (this as any).transform = saved;
      }
      rt = pooled;
    } else {
      rt = app.renderer.generateTexture(this, { region, resolution: res });
    }
    scene.textures.addTexture(key, rt);
    return scene.textures.get(key);
  }
}
