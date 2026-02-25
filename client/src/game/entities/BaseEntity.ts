import { EntityDepth } from '.';
import { isObject, mergeDeep } from '../../helpers';
import { ShapeTypes } from '../Types';
import { Shape, ShapeType } from '../physics/Shape';
import { Health } from '../components/Health';
import Game from '../scenes/Game';

export class BaseEntity {
  static stateFields: string[] = ['id', 'type', 'shapeData', 'depth', 'healthPercent'];
  static removeTransition = 0;

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
    }
  }

  afterStateUpdate(data: any) {}

  update(dt: number) {
    if (!this.container) return;
    const lerpRate = Math.min(this.game.gameState.tps / this.game.game.loop.actualFps, 1);
    this.container.x = Phaser.Math.Linear(this.container.x, this.shape.x, lerpRate);
    this.container.y = Phaser.Math.Linear(this.container.y, this.shape.y, lerpRate);
    if (this.shape.type === ShapeTypes.Polygon) {
      this.container.setRotation(this.shape.angle);
    }
    this.updateRotation();
    this.updateWorldDepth();
    this.healthBar?.update(dt);
  }

  updateRotation() {
    if (!this.body) return;

    const targetAngle = (this.constructor as any).basicAngle + this.angle;
    const angleDifference = Phaser.Math.Angle.Wrap(targetAngle - this.body.rotation);
    const lerpRate = Math.min(this.game.gameState.tps / this.game.game.loop.actualFps / 10, 0.1);
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
      } else {
        this.game.tweens.add({
          targets: [this.container, this.healthBar?.bar],
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
        this.container.scene.tweens.add({
          targets: this.container,
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
