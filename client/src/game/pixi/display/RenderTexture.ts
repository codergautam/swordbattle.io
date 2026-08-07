import { Container as PixiContainer, RenderTexture as PixiRT } from 'pixi.js-legacy';
import { Sprite } from './Sprite';

type BatchEntry = { child: any; x: number; y: number; px: number; py: number; visible: boolean; renderable: boolean; parent: any };

export class RenderTexture extends Sprite {
  rt: PixiRT;
  private static scratch: PixiContainer | null = null;
  private batchList: BatchEntry[] | null = null;

  constructor(x = 0, y = 0, width = 32, height = 32) {
    const rt = PixiRT.create({ width: Math.max(1, Math.ceil(width)), height: Math.max(1, Math.ceil(height)), resolution: 1 });
    super(rt);
    this.rt = rt;
    this.setPosition(x, y);
  }

  private _renderer(): any {
    const s = this._scene;
    return s && s.game && s.game.app ? s.game.app.renderer : null;
  }

  clear(): this {
    const r = this._renderer();
    if (r) {
      try {
        if (r.renderTexture) {
          r.renderTexture.bind(this.rt);
          r.renderTexture.clear([0, 0, 0, 0]);
          r.renderTexture.bind(null);
        } else {
          const target = (this.rt.baseTexture as any)._canvasRenderTarget;
          if (target) target.clear();
        }
      } catch (e) { /* noop */ }
    }
    return this;
  }

  beginDraw(): this { this.batchList = []; return this; }

  batchDraw(child: any, x?: number, y?: number): this {
    if (!this.batchList) return this.draw(child, x, y);
    if (!child) return this;
    const moved = x !== undefined;
    this.batchList.push({
      child,
      x: moved ? (x as number) : child.x,
      y: moved ? (y === undefined ? (x as number) : y) : child.y,
      px: child.x, py: child.y,
      visible: child.visible, renderable: child.renderable,
      parent: child.parent,
    });
    return this;
  }

  renderScale = 1;

  endDraw(): this {
    const list = this.batchList;
    this.batchList = null;
    if (!list || !list.length) return this;
    const r = this._renderer();
    if (!r) return this;
    let scratch = RenderTexture.scratch;
    if (!scratch) scratch = RenderTexture.scratch = new PixiContainer();
    scratch.scale.set(this.renderScale);
    for (const e of list) {
      e.child.visible = true;
      e.child.renderable = true;
      e.child.position.set(e.x, e.y);
      scratch.addChild(e.child);
    }
    try {
      r.render(scratch, { renderTexture: this.rt, clear: false, skipUpdateTransform: false });
    } catch (e) { /* noop */ }
    scratch.scale.set(1);
    for (const e of list) {
      scratch.removeChild(e.child);
      if (e.parent) e.parent.addChild(e.child);
      e.child.visible = e.visible;
      e.child.renderable = e.renderable;
      e.child.position.set(e.px, e.py);
    }
    return this;
  }

  batchDrawFrame(): this { return this; }

  draw(child: any, x?: number, y?: number): this {
    const r = this._renderer();
    if (!r || !child) return this;
    const moved = x !== undefined;
    const sx = child.x, sy = child.y, sv = child.visible, sr = child.renderable, sp = child.parent;
    try {
      child.visible = true; child.renderable = true;
      if (moved) child.position.set(x as number, y === undefined ? (x as number) : y);
      (child as any).parent = null;
      r.render(child, { renderTexture: this.rt, clear: false, skipUpdateTransform: false });
    } catch (e) { /* noop */ }
    (child as any).parent = sp;
    child.visible = sv; child.renderable = sr;
    if (moved) child.position.set(sx, sy);
    return this;
  }

  erase(): this { return this; }
  fill(): this { return this; }
  saveTexture(): any { return this.rt; }
  resize(width: number, height: number): this {
    this.rt.resize(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
    return this;
  }

  destroy(fromScene?: boolean): void {
    const rt = this.rt;
    super.destroy(fromScene);
    try { if (rt) rt.destroy(true); } catch (e) { /* noop */ }
  }
}
