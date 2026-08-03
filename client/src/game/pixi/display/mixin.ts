import { Container as PixiContainer, IPointData, ObservablePoint, Graphics as PixiGraphics, Rectangle } from 'pixi.js';
import { toPixiBlend } from '../mathgeom';

export type Constructor<T = {}> = new (...args: any[]) => T;

let globalInsertSeq = 0;
export function nextInsertSeq(): number { return globalInsertSeq++; }

export function applyPhaserGO<TBase extends Constructor<PixiContainer>>(Base: TBase) {
  return class PhaserGO extends Base {
    _depth = 0;
    _insertSeq = nextInsertSeq();
    _scrollFactorX = 1;
    _scrollFactorY = 1;
    _texKey = '';
    _data: Record<string, any> | null = null;
    _scene: any = null;
    active = true;

    setPosition(x = 0, y = x, _z?: number, _w?: number): this { this.transform.position.set(x, y); return this; }
    setX(x = 0): this { this.transform.position.x = x; return this; }
    setY(y = 0): this { this.transform.position.y = y; return this; }

    get scale(): any { return (this.transform.scale.x + this.transform.scale.y) / 2; }
    set scale(v: number | IPointData) {
      if (typeof v === 'number') this.transform.scale.set(v, v);
      else this.transform.scale.copyFrom(v);
    }
    setScale(x = 1, y = x): this { this.transform.scale.set(x, y); return this; }
    get scaleX(): number { return this.transform.scale.x; }
    set scaleX(v: number) { this.transform.scale.x = v; }
    get scaleY(): number { return this.transform.scale.y; }
    set scaleY(v: number) { this.transform.scale.y = v; }

    setRotation(radians = 0): this { this.rotation = radians; return this; }
    setAngle(degrees = 0): this { this.angle = degrees; return this; }

    setAlpha(a = 1): this { this.alpha = a; return this; }
    setVisible(v: boolean): this { this.visible = v; return this; }
    setActive(a: boolean): this { this.active = a; return this; }

    get depth(): number { return this._depth; }
    set depth(d: number) { this._depth = d; this.zIndex = d; }
    setDepth(d = 0): this { this.depth = d; return this; }

    setTint(color = 0xffffff): this { (this as any).tint = color; return this; }
    clearTint(): this { (this as any).tint = 0xffffff; return this; }
    setTintFill(color = 0xffffff): this {
      if ((color & 0xffffff) !== 0) {
        throw new Error('[pixi-shim] setTintFill only supports 0x000000 (silhouette); got 0x' + (color >>> 0).toString(16));
      }
      (this as any).tint = 0x000000;
      return this;
    }

    setBlendMode(mode: number): this { (this as any).blendMode = toPixiBlend(mode); return this; }

    setScrollFactor(x = 1, y = x): this {
      this._scrollFactorX = x; this._scrollFactorY = y;
      if (this._scene && typeof this._scene.reparentByScrollFactor === 'function') {
        this._scene.reparentByScrollFactor(this);
      }
      return this;
    }
    get scrollFactorX(): number { return this._scrollFactorX; }
    get scrollFactorY(): number { return this._scrollFactorY; }

    setMask(mask: any): this {
      const g = mask && mask.geometryMask ? mask.geometryMask : mask;
      const useMask = (g && mask && mask.invertAlpha) ? PhaserGO._buildInverseMask(g) : g;
      (this as any).mask = useMask || null;
      if (useMask) {
        (useMask as any).renderable = false;
        if (!(useMask as any).parent) {
          const root = (this._scene && this._scene.worldRoot) || (this as any).parent;
          if (root) root.addChild(useMask);
        }
      }
      return this;
    }

    static _buildInverseMask(src: any): PixiGraphics {
      const inv = new PixiGraphics();
      inv.position.copyFrom(src.transform.position);
      inv.scale.copyFrom(src.transform.scale);
      inv.rotation = src.rotation || 0;
      inv.pivot.copyFrom(src.transform.pivot);
      const b = src.getLocalBounds();
      const m = 100000;
      inv.beginFill(0xffffff, 1);
      inv.drawRect(b.x - m, b.y - m, b.width + 2 * m, b.height + 2 * m);
      inv.beginHole();
      const gd = src.geometry && src.geometry.graphicsData;
      if (gd && gd.length) {
        for (const d of gd) inv.drawShape(d.shape);
      } else {
        inv.drawRect(b.x, b.y, b.width, b.height);
      }
      inv.endHole();
      inv.endFill();
      return inv;
    }
    clearMask(destroyMask = false): this {
      const m = (this as any).mask;
      (this as any).mask = null;
      if (destroyMask && m && typeof m.destroy === 'function') m.destroy();
      return this;
    }

    setOrigin(_x?: number, _y?: number): this { return this; }

    setInteractive(hitAreaOrConfig?: any, _contains?: any): this {
      (this as any).eventMode = 'static';
      (this as any).cursor = 'pointer';
      const h = hitAreaOrConfig;
      if (h && typeof h === 'object' && typeof h.x === 'number' && typeof h.width === 'number' && typeof h.height === 'number') {
        (this as any).hitArea = new Rectangle(h.x, h.y, h.width, h.height);
      }
      return this;
    }
    disableInteractive(): this { (this as any).eventMode = 'none'; return this; }
    removeInteractive(): this { (this as any).eventMode = 'none'; (this as any).hitArea = null; return this; }

    get scene(): any { return this._scene; }

    setName(name: string): this { this.name = name; return this; }
    setData(key: string, value: any): this { (this._data || (this._data = {}))[key] = value; return this; }
    getData(key: string): any { return this._data ? this._data[key] : undefined; }

    destroy(_fromScene?: boolean): void {
      if ((this as any).destroyed) return;
      this._scene = null;
      super.destroy({ children: true });
    }
  };
}
