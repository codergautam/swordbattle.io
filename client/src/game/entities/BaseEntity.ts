import { EntityDepth } from '.';
import { isObject, mergeDeep } from '../../helpers';
import { ShapeTypes } from '../Types';
import { Shape, ShapeType } from '../physics/Shape';
import { Health } from '../components/Health';
import Game from '../scenes/Game';

export class BaseEntity {
  static stateFields: string[] = ['id', 'type', 'shapeData', 'depth', 'healthPercent'];
  static removeTransition = 0;
  static readonly INTERP_DELAY_MS = 75;

  [key: string]: any;
  game: Game;
  shape!: ShapeType;
  container: any = null;
  healthBar?: Health;
  removed: boolean = false;
  hidden: boolean = false;
  depth = 0;
  justSpawned = true;
  _snapshots: Array<{time: number, x: number, y: number}> = [];

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
    const canvasTexture = this.game.textures.createCanvas(shadowKey, source.width, source.height)!;
    const ctx = canvasTexture.getContext();
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, source.width, source.height);
    canvasTexture.refresh();
    return shadowKey;
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
        if (this[key] instanceof BaseEntity) {
          this[key].updateState(data[key]);
        } else if (isObject(data[key]) && this[key]) {
          mergeDeep(this[key], data[key]);
        } else {
          this[key] = data[key];
        }
      }
    }
    this.afterStateUpdate(data);
  }

  beforeStateUpdate(data: any) {
    if (data.shapeData !== undefined) {
      if (!this.shape) {
        this.shape = Shape.create(data.shapeData);
      } else {
        this.shape.update(data.shapeData);
      }
      // Record snapshot for interpolation
      const now = Date.now();
      this._snapshots.push({ time: now, x: this.shape.x, y: this.shape.y });
      // Prune old snapshots (keep only recent history)
      const cutoff = now - (BaseEntity.INTERP_DELAY_MS * 5);
      while (this._snapshots.length > 2 && this._snapshots[0].time < cutoff) {
        this._snapshots.shift();
      }
    }
  }

  afterStateUpdate(data: any) {}

  update(dt: number) {
    if (!this.container) return;
    this._updatePosition(dt);
    if (this.shape.type === ShapeTypes.Polygon) {
      this.container.setRotation(this.shape.angle);
    }
    this.updateRotation(dt);
    this.updateWorldDepth();
    this.healthBar?.update(dt);
  }

  _updatePosition(dt: number) {
    const snaps = this._snapshots;
    if (snaps.length >= 2) {
      const renderTime = Date.now() - BaseEntity.INTERP_DELAY_MS;

      // Find the highest snapshot at or before renderTime
      let lowerIdx = 0;
      for (let i = 1; i < snaps.length; i++) {
        if (snaps[i].time <= renderTime) {
          lowerIdx = i;
        } else {
          break;
        }
      }

      const s1 = snaps[lowerIdx];
      const s2 = snaps[lowerIdx + 1];

      if (s2 && s1.time <= renderTime) {
        // Interpolate between s1 and s2
        const span = s2.time - s1.time;
        const t = span > 0 ? Math.min(1, (renderTime - s1.time) / span) : 1;
        this.container.x = s1.x + (s2.x - s1.x) * t;
        this.container.y = s1.y + (s2.y - s1.y) * t;
      } else {
        // renderTime is past all snapshots — lerp toward the latest to keep up
        const tps = this.game.gameState.tps || 20;
        const lerpRate = 1 - Math.exp(-dt / (1000 / tps));
        this.container.x = Phaser.Math.Linear(this.container.x, s1.x, lerpRate);
        this.container.y = Phaser.Math.Linear(this.container.y, s1.y, lerpRate);
      }
    } else {
      // Not enough snapshots yet — fall back to original lerp
      const tps = this.game.gameState.tps || 20;
      const lerpRate = 1 - Math.exp(-dt / (1000 / tps));
      this.container.x = Phaser.Math.Linear(this.container.x, this.shape.x, lerpRate);
      this.container.y = Phaser.Math.Linear(this.container.y, this.shape.y, lerpRate);
    }
  }

  updateRotation(dt?: number) {
    if (!this.body) return;

    const targetAngle = (this.constructor as any).basicAngle + this.angle;
    const angleDifference = Phaser.Math.Angle.Wrap(targetAngle - this.body.rotation);
    const tps = this.game.gameState.tps || 20;
    const lerpRate = 1 - Math.exp(-(dt || 16) / (10000 / tps));
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
        if (this.healthBar && typeof this.healthBar.destroy === 'function') {
          this.healthBar.destroy();
          this.healthBar = undefined;
        }

        if (this.container) {
          try {
            if (this.container.scene && this.container.scene.tweens) {
              const tweens = (this.container.scene.tweens as any)._tweens || [];
              for (const tw of tweens.slice()) {
                try {
                  if (tw && tw.targets && tw.targets.indexOf && tw.targets.indexOf(this.container) !== -1) {
                    tw.stop();
                  }
                } catch (e) {}
              }
            }
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

    if (!duration) {
      destroyNow();
      return;
    }

    try {
      if (this.container && this.container.scene && this.container.scene.tweens) {
        const fadeTargets: any[] = [this.container];
        if (this.healthBar) {
          fadeTargets.push(this.healthBar.bar);
          if (this.healthBar.cooldownBar) fadeTargets.push(this.healthBar.cooldownBar);
        }
        this.container.scene.tweens.add({
          targets: fadeTargets,
          alpha: 0,
          duration,
          onComplete: destroyNow,
        });
        return;
      }
    } catch (e) {}

    destroyNow();
  }
}
