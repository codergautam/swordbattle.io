import { RenderTexture as PixiRT } from 'pixi.js';
import { Sprite } from './Sprite';

export class RenderTexture extends Sprite {
  rt: PixiRT;

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
        r.renderTexture.bind(this.rt);
        r.renderTexture.clear([0, 0, 0, 0]);
        r.renderTexture.bind(null);
      } catch (e) { /* noop */ }
    }
    return this;
  }

  beginDraw(): this { return this; }
  endDraw(): this { return this; }
  batchDrawFrame(): this { return this; }
  batchDraw(child: any, x?: number, y?: number): this { return this.draw(child, x, y); }

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
