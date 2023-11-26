import { BaseEntity } from '../entities/BaseEntity';
import Game from '../scenes/Game';

interface HealthOptions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  hideWhenFull: boolean;
  alwaysHide: boolean;
}

const defaultOptions: HealthOptions = {
  width: 200,
  height: 30,
  hideWhenFull: true,
  offsetX: 0,
  offsetY: 0,
  alwaysHide: false
};

export class Health {
  game: Game;
  entity: BaseEntity;
  bar: Phaser.GameObjects.Graphics;
  options: HealthOptions;
  value: number;
  hidden = false;
  internalHidden = false;
  alwaysHide = false;

  constructor(entity: any, options: Partial<HealthOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options);

    this.game = entity.game;
    this.entity = entity;
    this.value = entity.healthPercent;
    this.bar = this.game.add.graphics().setDepth(100);
    this.game.add.existing(this.bar);
    this.alwaysHide = this.options.alwaysHide;
  }

  update(dt: number) {
    if(this.alwaysHide) return;
    this.value = Phaser.Math.Linear(this.value, this.entity.healthPercent, dt / 60);

    if (!this.hidden) {
      const shouldHide = this.value > 0.98;
      if (this.options.hideWhenFull && shouldHide !== this.internalHidden) {
        this.game.add.tween({
          targets: this.bar,
          alpha: shouldHide ? 0 : 1,
          duration: 500,
        });
        this.internalHidden = shouldHide;
      }
    }

    const scale = this.entity.container.scale;
    const width = this.options.width * scale;
    const height = this.options.height * scale;

    this.bar.setPosition(
      (this.entity.container.x - width / 2) + this.options.offsetX * scale,
      this.entity.container.y + this.options.offsetY * scale,
    );

    if (this.hidden || this.internalHidden) return;

    let healthColor = 65280;
    if (this.value < 0.3) {
      healthColor = 16711680;
    } else if (this.value < 0.5) {
      healthColor = 16776960;
    }

    this.bar.clear();
    this.bar.lineStyle(4, 0x000000);
    this.bar.strokeRect(0, 0, width, height);
    this.bar.fillStyle(healthColor);
    this.bar.fillRect(0, 0, width * this.value, height);
  }

  destroy() {
    this.bar.destroy();
    this.entity.healthBar = undefined;
  }
}
