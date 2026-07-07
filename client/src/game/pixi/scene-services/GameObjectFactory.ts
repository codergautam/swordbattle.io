import { Container, Sprite, Image, Text, Graphics, TileSprite } from '../display';
import { RenderTexture } from '../display/RenderTexture';
import { ZoneStub, DomElementStub } from './stubs';
import { ParticleEmitter } from './ParticleEmitter';

export class GameObjectFactory {
  private _scene: any;
  private autoAdd: boolean;

  constructor(scene: any, autoAdd = true) { this._scene = scene; this.autoAdd = autoAdd; }

  private init(obj: any): any {
    obj._scene = this._scene;
    if (this.autoAdd) this._scene.addToDisplayList(obj);
    return obj;
  }

  sprite(x: number, y: number, key?: string): Sprite {
    const s = new Sprite(key ? this._scene.textures.getPixi(key) : undefined);
    s.setPosition(x, y);
    if (key) s._texKey = key;
    return this.init(s);
  }

  image(x: number, y: number, key?: string): Image {
    const s = new Image(key ? this._scene.textures.getPixi(key) : undefined);
    s.setPosition(x, y);
    if (key) s._texKey = key;
    return this.init(s);
  }

  container(x = 0, y = 0, children?: any[]): Container {
    const c = new Container(x, y, children);
    return this.init(c);
  }

  text(x: number, y: number, text: string | string[] = '', style?: any): Text {
    const t = new Text(x, y, text, style);
    return this.init(t);
  }

  graphics(config?: any): Graphics {
    const g = new Graphics();
    if (config) {
      if (config.x != null || config.y != null) g.setPosition(config.x || 0, config.y || 0);
      if (config.fillStyle) g.fillStyle(config.fillStyle.color, config.fillStyle.alpha != null ? config.fillStyle.alpha : 1);
      if (config.lineStyle) g.lineStyle(config.lineStyle.width || 1, config.lineStyle.color, config.lineStyle.alpha != null ? config.lineStyle.alpha : 1);
    }
    return this.init(g);
  }

  tileSprite(x: number, y: number, width: number, height: number, key?: string): TileSprite {
    const t = new TileSprite(x, y, width, height, key ? this._scene.textures.getPixi(key) : undefined);
    if (key) t._texKey = key;
    return this.init(t);
  }

  tween(config: any): any { return this._scene.tweens.add(config); }

  zone(x: number, y: number, width: number, height: number): ZoneStub {
    return this.init(new ZoneStub(x, y, width, height));
  }

  dom(x: number, y: number, element?: any, _style?: any, _innerText?: any): DomElementStub {
    return this.init(new DomElementStub(x, y, element));
  }

  renderTexture(x: number, y: number, width: number, height: number): RenderTexture {
    const rt = new RenderTexture(x, y, width, height);
    return this.init(rt);
  }
  particles(x = 0, y = 0, key?: string, config?: any): ParticleEmitter {
    const tex = key ? this._scene.textures.getPixi(key) : undefined;
    const e = new ParticleEmitter(this._scene, x, y, tex, config || {}, this._scene.particleManager);
    this.init(e);
    this._scene.particleManager.add(e);
    return e;
  }

  existing(obj: any): any { return this.init(obj); }
}
