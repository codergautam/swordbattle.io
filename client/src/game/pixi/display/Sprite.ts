import { Sprite as PixiSprite, Texture } from 'pixi.js-legacy';
import { applyPhaserGO } from './mixin';

const PhaserSpriteBase = applyPhaserGO(PixiSprite);

export class Sprite extends PhaserSpriteBase {
  constructor(texture?: Texture) {
    super(texture);
    this._anchor.set(0.5, 0.5);
  }

  setOrigin(x = 0.5, y = x): this { this._anchor.set(x, y); return this; }
  get originX(): number { return this._anchor.x; }
  set originX(v: number) { this._anchor.x = v; }
  get originY(): number { return this._anchor.y; }
  set originY(v: number) { this._anchor.y = v; }

  get displayWidth(): number { const t = this.texture; return Math.abs(this.transform.scale.x) * (t ? t.orig.width : 0); }
  set displayWidth(v: number) { (this as any).width = v; }
  get displayHeight(): number { const t = this.texture; return Math.abs(this.transform.scale.y) * (t ? t.orig.height : 0); }
  set displayHeight(v: number) { (this as any).height = v; }

  setDisplaySize(w: number, h: number): this { this.displayWidth = w; this.displayHeight = h; return this; }

  setTexture(texture: Texture | string): this {
    if (typeof texture === 'string') {
      this._texKey = texture;
      const tm = this._scene && this._scene.textures;
      if (tm) this.texture = tm.getPixi(texture);
    } else {
      this.texture = texture;
      this._texKey = (texture as any)?.textureCacheIds?.[0] ?? this._texKey;
    }
    return this;
  }
}

function frameW(s: Sprite): number { const t = s.texture; return t ? t.orig.width : 0; }
function frameH(s: Sprite): number { const t = s.texture; return t ? t.orig.height : 0; }
Object.defineProperty(Sprite.prototype, 'width', {
  configurable: true,
  get(this: Sprite): number { return frameW(this); },
  set(this: Sprite, v: number) { const w = frameW(this); this.transform.scale.x = w ? v / w : 1; },
});
Object.defineProperty(Sprite.prototype, 'height', {
  configurable: true,
  get(this: Sprite): number { return frameH(this); },
  set(this: Sprite, v: number) { const h = frameH(this); this.transform.scale.y = h ? v / h : 1; },
});
