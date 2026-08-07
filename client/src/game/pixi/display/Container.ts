import { Container as PixiContainer, DisplayObject } from 'pixi.js-legacy';
import { applyPhaserGO } from './mixin';

export class Container extends applyPhaserGO(PixiContainer) {
  constructor(x = 0, y = 0, children?: DisplayObject[]) {
    super();
    this.transform.position.set(x, y);
    if (children && children.length) this.addChild(...children);
  }

  add(child: DisplayObject | DisplayObject[]): this {
    if (Array.isArray(child)) { if (child.length) this.addChild(...child); }
    else this.addChild(child);
    return this;
  }

  addAt(child: DisplayObject, index = 0): this {
    this.addChildAt(child, Math.max(0, Math.min(index, this.children.length)));
    return this;
  }

  remove(child: DisplayObject, destroyChild = false): this {
    this.removeChild(child);
    if (destroyChild) child.destroy();
    return this;
  }

  removeAll(destroyChild = false): this {
    const kids = this.removeChildren();
    if (destroyChild) for (const k of kids) k.destroy();
    return this;
  }

  bringToTop(child: DisplayObject): this {
    if (this.children.indexOf(child) !== -1) this.setChildIndex(child, this.children.length - 1);
    return this;
  }

  get list(): DisplayObject[] { return this.children; }
}
