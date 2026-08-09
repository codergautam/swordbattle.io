import { EntityDepth } from '.';
import { isObject, mergeDeepInto } from '../../helpers';
import { ShapeTypes } from '../Types';
import { Shape, ShapeType } from '../physics/Shape';
import { Health } from '../components/Health';
import { Settings } from '../Settings';
import Game from '../scenes/Game';

export class BaseEntity {
  static stateFields: string[] = ['id', 'type', 'shapeData', 'depth', 'healthPercent'];
  static removeTransition = 0;

  static destroyQueue: Array<() => void> = [];
  static drainDestroys(budget: number) {
    const q = BaseEntity.destroyQueue;
    for (let i = 0; i < budget && q.length; i++) {
      const fn = q.shift();
      if (fn) { try { fn(); } catch (e) {} }
    }
  }

  static shadow = {
    alpha: 0.17,
    scaleMul: 1.07,
    shiftRatio: 0.05,
  };

  static livingShadowsEnabled = Settings.livingShadows !== false;
  private static livingShadows = new Set<Phaser.GameObjects.Sprite>();

  static setLivingShadowsEnabled(on: boolean) {
    BaseEntity.livingShadowsEnabled = on;
    for (const s of Array.from(BaseEntity.livingShadows)) {
      if (!s || !(s as any).scene) { BaseEntity.livingShadows.delete(s); continue; }
      s.setVisible(on);
    }
  }

  [key: string]: any;
  game: Game;
  shape!: ShapeType;
  container: any = null;
  healthBar?: Health;
  removed: boolean = false;
  hidden: boolean = false;
  depth = 0;
  justSpawned = true;

  constructor(game: Game) {
    this.game = game;
  }

  createSprite() {}

  protected createShadow(radius: number, alpha = 0.25): Phaser.GameObjects.Graphics {
    const shadow = this.game.add.graphics();
    shadow.fillStyle(0x000000, 1);
    shadow.fillCircle(0, 0, radius);
    shadow.setAlpha(alpha);
    return shadow;
  }

  protected createShadowTexture(sourceKey: string): string {
    const shadowKey = sourceKey + '_shadow';
    if (this.game.textures.exists(shadowKey)) return shadowKey;

    const source = this.game.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    if (!source || !source.width || !source.height) return sourceKey;
    const canvasTexture = this.game.textures.createCanvas(shadowKey, source.width, source.height)!;
    const ctx = canvasTexture.getContext();
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, source.width, source.height);
    canvasTexture.refresh();
    return shadowKey;
  }

  protected setShadowSilhouette(shadow: Phaser.GameObjects.Sprite, sourceKey: string) {
    if (!shadow || !sourceKey) return;
    if (this.game.renderer.type === Phaser.WEBGL) {
      shadow.setTexture(sourceKey);
      shadow.setTintFill(0x000000);
    } else {
      shadow.setTexture(this.createShadowTexture(sourceKey));
    }
  }

  protected createOutlineShadow(
    sourceKey: string,
    originX = 0.5,
    originY = 0.5,
    opts: { living?: boolean } = {},
  ): Phaser.GameObjects.Sprite {
    const s = this.game.add.sprite(0, 0, sourceKey).setOrigin(0.5, 0.5);
    this.setShadowSilhouette(s, sourceKey);
    s.setAlpha(BaseEntity.shadow.alpha);
    if (opts.living) this.markLivingShadow(s);
    return s;
  }

  protected createBakedOutlineShadow(
    sourceKey: string,
    originX = 0.5,
    originY = 0.5,
    opts: { living?: boolean } = {},
  ): Phaser.GameObjects.Sprite {
    const shadowKey = this.createShadowTexture(sourceKey);
    const s = this.game.add.sprite(0, 0, shadowKey).setOrigin(0.5, 0.5);
    s.setAlpha(BaseEntity.shadow.alpha);
    if (opts.living) this.markLivingShadow(s);
    return s;
  }

  protected markLivingShadow(s: Phaser.GameObjects.Sprite) {
    BaseEntity.livingShadows.add(s);
    (this.myLivingShadows || (this.myLivingShadows = [])).push(s);
    s.setVisible(BaseEntity.livingShadowsEnabled);
  }

  protected syncOutlineShadow(
    shadow: Phaser.GameObjects.Sprite | null | undefined,
    body: Phaser.GameObjects.Sprite | null | undefined,
  ) {
    if (!shadow || !body) return;
    const k = BaseEntity.shadow.scaleMul;
    shadow.setScale(body.scaleX * k, body.scaleY * k);
    shadow.setRotation(body.rotation);
    const ox = (0.5 - body.originX) * body.displayWidth;
    const oy = (0.5 - body.originY) * body.displayHeight;
    const cos = Math.cos(body.rotation);
    const sin = Math.sin(body.rotation);
    const cx = body.x + ox * cos - oy * sin;
    const cy = body.y + ox * sin + oy * cos;
    shadow.setPosition(cx, cy + body.displayHeight * BaseEntity.shadow.shiftRatio);
  }

  protected refreshBodyShadow(
    shadow: Phaser.GameObjects.Sprite | null | undefined,
    body: Phaser.GameObjects.Sprite | null | undefined,
  ) {
    if (!shadow || !body) return;
    const key = body.texture?.key;
    if (key && key !== '__MISSING' && key !== '') {
      this.setShadowSilhouette(shadow, key);
    }
    this.syncOutlineShadow(shadow, body);
  }

  setDepth() {
    if (!this.container) return;
    this.container.setDepth(EntityDepth[this.type] || 0);
  }

  resetState() {
    for (const key of (this.constructor as typeof BaseEntity).stateFields) {
      if (this[key] !== undefined) {
        if (this[key] instanceof BaseEntity) {
          this[key].resetState();
        } else {
          delete this[key];
        }
      }
    }
  }

  updateState(data: any) {
    this.beforeStateUpdate(data);
    for (const key of (this.constructor as typeof BaseEntity).stateFields) {
      if (data[key] !== undefined) {
        if (Array.isArray(data[key]) && data[key].length === 0 && Array.isArray(this[key]) && this[key].length > 0) {
          continue;
        }
        if (this[key] instanceof BaseEntity) {
          this[key].updateState(data[key]);
        } else if (isObject(data[key]) && this[key]) {
          mergeDeepInto(this[key], data[key]);
        } else {
          this[key] = data[key];
        }
      }
    }
    this.afterStateUpdate(data);
  }

  posBuffer: { t: number, x: number, y: number }[] | null = null;

  beforeStateUpdate(data: any) {
    if (data.shapeData !== undefined) {
      if (!this.shape) {
        this.shape = Shape.create(data.shapeData);
      } else {
        this.shape.update(data.shapeData);
      }
      const gs = this.game.gameState;
      if (gs.interpolationEnabled && !this.isMe && data.shapeData.x !== undefined) {
        this.pushPositionSample(gs.snapClock, this.shape.x, this.shape.y);
      }
    }
  }

  private pushPositionSample(t: number, x: number, y: number) {
    const buf = this.posBuffer || (this.posBuffer = []);
    const last = buf[buf.length - 1];
    if (last && t <= last.t) { last.x = x; last.y = y; return; }
    buf.push({ t, x, y });
    if (buf.length > 16) buf.shift();
  }

  afterStateUpdate(data: any) {}

  update(dt: number) {
    if (!this.container) return;

    const gs = this.game.gameState;
    const buf = this.posBuffer;
    if (gs.interpolationEnabled && gs.renderClockInit && !this.isMe && buf && buf.length >= 2) {
      const renderTime = gs.renderClock;
      while (buf.length >= 3 && buf[1].t <= renderTime) buf.shift();
      const s0 = buf[0];
      const s1 = buf[1];
      if (renderTime <= s0.t) {
        this.container.x = s0.x;
        this.container.y = s0.y;
      } else if (renderTime >= s1.t) {
        this.container.x = s1.x;
        this.container.y = s1.y;
      } else {
        const a = (renderTime - s0.t) / (s1.t - s0.t);
        this.container.x = s0.x + (s1.x - s0.x) * a;
        this.container.y = s0.y + (s1.y - s0.y) * a;
      }
    } else {
      const lerpRate = gs.frameLerpRate;
      const dx = this.shape.x - this.container.x;
      const dy = this.shape.y - this.container.y;
      if (dx * dx + dy * dy < 0.25) {
        this.container.x = this.shape.x;
        this.container.y = this.shape.y;
      } else {
        this.container.x += dx * lerpRate;
        this.container.y += dy * lerpRate;
      }
    }

    if (this.shape.type === ShapeTypes.Polygon) {
      this.container.setRotation(this.shape.angle);
    }
    this.updateRotation(dt);
    this.updateWorldDepth();
    this.healthBar?.update(dt);
  }

  updateRotation(dt?: number) {
    if (!this.body) return;

    const targetAngle = (this.constructor as any).basicAngle + this.angle;
    const angleDifference = Phaser.Math.Angle.Wrap(targetAngle - this.body.rotation);
    const lerpRate = this.game.gameState.frameRotLerpRate;
    const angleStep = angleDifference * lerpRate;
    this.body.setRotation(this.body.rotation + angleStep);
  }

  updateWorldDepth() {
    const self = this.game.gameState.self.entity as any;
    if (!self) return;

    const show = self.depth === this.depth || this.depth === 0;
    if (this.healthBar) this.healthBar.hidden = !show;
    if (this.hidden !== show) {
      const targetAlpha = show ? 1 : 0;
      if (this.justSpawned) {
        if (this.container) this.container.alpha = targetAlpha;
        if (this.healthBar?.bar) this.healthBar.bar.alpha = targetAlpha;
        if (this.healthBar?.cooldownBar) this.healthBar.cooldownBar.alpha = targetAlpha;
      } else {
        this.game.tweens.add({
          targets: [this.container, this.healthBar?.bar, this.healthBar?.cooldownBar].filter(Boolean),
          alpha: targetAlpha,
          duration: 50,
        });
      }
      this.hidden = show;
    }

    this.justSpawned = false;
  }

  remove() {
    const duration = (this.constructor as typeof BaseEntity).removeTransition;

    const destroyNow = () => {
      try {
        if (this.myLivingShadows) {
          for (const s of this.myLivingShadows) BaseEntity.livingShadows.delete(s);
          this.myLivingShadows = null;
        }

        if (this.healthBar && typeof this.healthBar.destroy === 'function') {
          this.healthBar.destroy();
          this.healthBar = undefined;
        }

        if (this.container) {
          try {
            this.container.scene?.tweens?.killTweensOf(this.container);
          } catch (e) {}

          try {
            this.container.destroy(true);
          } catch (e) {}
          this.container = null;
        }

        (this as any).body = null;
        this.shape = (null as any);
        this.removed = true;
      } catch (e) {
        console.error('Error during entity destroy', e);
      }
    };

    if (!duration || (typeof document !== 'undefined' && document.hidden)) {
      destroyNow();
      return;
    }

    try {
      if (this.container && this.container.scene && this.container.scene.tweens) {
        const fadeTargets: any[] = [this.container];
        if (this.healthBar) {
          fadeTargets.push(this.healthBar.bar);
          if (this.healthBar.cooldownBar) fadeTargets.push(this.healthBar.cooldownBar);
          const extra = (this.healthBar as any).getFadeTargets?.();
          if (extra) fadeTargets.push(...extra);
        }
        this.container.scene.tweens.add({
          targets: fadeTargets,
          alpha: 0,
          duration,
          onComplete: () => BaseEntity.destroyQueue.push(destroyNow),
        });
        return;
      }
    } catch (e) {}

    destroyNow();
  }
}
