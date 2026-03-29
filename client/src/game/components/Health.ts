import { BaseEntity } from '../entities/BaseEntity';
import { EvolutionTypes } from '../Types';
import Game from '../scenes/Game';

interface HealthOptions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  hideWhenFull: boolean;
  alwaysHide: boolean;
  line: number;
  isPlayer: boolean;
}

const defaultOptions: HealthOptions = {
  width: 200,
  height: 30,
  hideWhenFull: true,
  offsetX: 0,
  offsetY: 0,
  alwaysHide: false,
  line: 4,
  isPlayer: false,
};

export class Health {
  game: Game;
  entity: BaseEntity;
  bar: Phaser.GameObjects.Graphics;
  cooldownBar: Phaser.GameObjects.Graphics | null = null;
  options: HealthOptions;
  value: number;
  hidden = false;
  internalHidden = false;
  alwaysHide = false;
  private lastDrawnValue = -1;
  private lastDrawnWidth = -1;
  private lastDrawnHeight = -1;
  private lastDrawnCooldownRatio = -1;
  private lastDrawnCooldownWidth = -1;
  private lastDrawnCooldownReady = false;
  private cooldownMax = 0;
  private smoothCooldownRatio = 1;
  private lastRawCooldown = 0;

  constructor(entity: any, options: Partial<HealthOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options);

    this.game = entity.game;
    this.entity = entity;
    this.value = entity.healthPercent;
    this.bar = this.game.add.graphics().setDepth(29);
    this.game.add.existing(this.bar);
    this.alwaysHide = this.options.alwaysHide;

    if (this.options.isPlayer) {
      this.cooldownBar = this.game.add.graphics().setDepth(29);
      this.game.add.existing(this.cooldownBar);
    }
  }

  private isInvisible(): boolean {
    const e = this.entity as any;
    return e.evolution === EvolutionTypes.Stalker && !!e.abilityActive;
  }

  update(dt: number) {
    if (this.alwaysHide) return;

    if (this.isInvisible()) {
      this.bar.clear();
      this.bar.setAlpha(0);
      if (this.cooldownBar) { this.cooldownBar.clear(); this.cooldownBar.setAlpha(0); }
      this.lastDrawnValue = -1;
      this.lastDrawnCooldownRatio = -1;
      return;
    }

    this.value = Phaser.Math.Linear(this.value, this.entity.healthPercent, 1 - Math.exp(-dt / 60));

    if (!this.hidden) {
      const shouldHide = this.value > 0.98;
      if (this.options.hideWhenFull && shouldHide !== this.internalHidden) {
        this.game.add.tween({
          targets: [this.bar, this.cooldownBar].filter(Boolean),
          alpha: shouldHide ? 0 : 1,
          duration: 500,
        });
        this.internalHidden = shouldHide;
      }
    }

    const scale = this.entity.container.scale;
    const width = this.options.width * scale;
    const height = this.options.height * scale;

    const barX = (this.entity.container.x - width / 2) + this.options.offsetX * scale;
    const barY = this.entity.container.y + this.options.offsetY * scale;

    this.bar.setPosition(barX, barY);

    if (!this.hidden && !this.internalHidden) {
      this.bar.setAlpha(1);
    }

    if (this.hidden || this.internalHidden) {
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
      return;
    }

    const roundedValue = Math.round(this.value * 200) / 200;
    if (roundedValue !== this.lastDrawnValue || width !== this.lastDrawnWidth || height !== this.lastDrawnHeight) {
      this.lastDrawnValue = roundedValue;
      this.lastDrawnWidth = width;
      this.lastDrawnHeight = height;
      this.drawHealthBar(width, height, scale);
    }

    if (this.options.isPlayer) {
      this.updateCooldownBar(dt, barX, barY, width, height, scale);
    }
  }

  private drawHealthBar(width: number, height: number, scale: number) {
    let healthColor = 0x44dd44;
    let healthColorDark = 0x2a8a2a;
    if (this.value < 0.3) {
      healthColor = 0xee3333;
      healthColorDark = 0x991a1a;
    } else if (this.value < 0.5) {
      healthColor = 0xeecc33;
      healthColorDark = 0x998a1a;
    }

    const borderWidth = Math.max(2, 3 * scale);

    this.bar.clear();

    this.bar.fillStyle(0x000000, 0.9);
    this.bar.fillRoundedRect(
      -borderWidth, -borderWidth,
      width + borderWidth * 2, height + borderWidth * 2,
      borderWidth * 1.5,
    );

    this.bar.fillStyle(0x222222, 0.85);
    this.bar.fillRoundedRect(0, 0, width, height, borderWidth);

    const fillWidth = width * this.value;
    if (fillWidth > 0) {
      this.bar.fillStyle(healthColor, 1);
      this.bar.fillRoundedRect(0, 0, fillWidth, height, borderWidth);

      this.bar.fillStyle(0xffffff, 0.2);
      this.bar.fillRoundedRect(0, 0, fillWidth, height * 0.4, borderWidth);

      this.bar.fillStyle(healthColorDark, 0.4);
      this.bar.fillRect(0, height * 0.6, fillWidth, height * 0.4);
    }
  }

  private updateCooldownBar(dt: number, healthBarX: number, healthBarY: number, healthWidth: number, healthHeight: number, scale: number) {
    if (!this.cooldownBar) return;

    const e = this.entity as any;
    const rawCooldown: number = e.swordFlyingCooldown ?? 0;

    if (rawCooldown > this.lastRawCooldown + 1) {
      this.cooldownMax = rawCooldown;
    }
    this.lastRawCooldown = rawCooldown;

    const targetRatio = this.cooldownMax > 0
      ? Math.max(0, Math.min(1, 1 - (rawCooldown / this.cooldownMax)))
      : 1;

    const lerpSpeed = 1 - Math.exp(-dt / 120);
    this.smoothCooldownRatio = Phaser.Math.Linear(this.smoothCooldownRatio, targetRatio, lerpSpeed);
    if (this.smoothCooldownRatio > 0.995) this.smoothCooldownRatio = 1;

    const isReady = rawCooldown <= 0;
    const ratio = this.smoothCooldownRatio;

    const barWidth = healthWidth;
    const barHeight = healthHeight * 0.5;
    const gap = 4 * scale;

    const barX = healthBarX;
    const barY = healthBarY + healthHeight + gap;

    this.cooldownBar.setPosition(barX, barY);
    this.cooldownBar.setAlpha(this.bar.alpha);

    const roundedRatio = Math.round(ratio * 200) / 200;
    if (roundedRatio !== this.lastDrawnCooldownRatio || barWidth !== this.lastDrawnCooldownWidth || isReady !== this.lastDrawnCooldownReady) {
      this.lastDrawnCooldownRatio = roundedRatio;
      this.lastDrawnCooldownWidth = barWidth;
      this.lastDrawnCooldownReady = isReady;

      const fillColor = isReady ? 0xffdd00 : 0xcc4422;
      const fillColorDark = isReady ? 0xbb9900 : 0x882211;
      const borderWidth = Math.max(1.5, 2.5 * scale);

      this.cooldownBar.clear();

      this.cooldownBar.fillStyle(0x000000, 0.85);
      this.cooldownBar.fillRoundedRect(
        -borderWidth, -borderWidth,
        barWidth + borderWidth * 2, barHeight + borderWidth * 2,
        borderWidth * 1.5,
      );

      this.cooldownBar.fillStyle(0x1a1a1a, 0.8);
      this.cooldownBar.fillRoundedRect(0, 0, barWidth, barHeight, borderWidth);

      const fillWidth = barWidth * ratio;
      if (fillWidth > 0) {
        this.cooldownBar.fillStyle(fillColor, 1);
        this.cooldownBar.fillRoundedRect(0, 0, fillWidth, barHeight, borderWidth);

        this.cooldownBar.fillStyle(0xffffff, 0.25);
        this.cooldownBar.fillRoundedRect(0, 0, fillWidth, barHeight * 0.4, borderWidth);

        this.cooldownBar.fillStyle(fillColorDark, 0.4);
        this.cooldownBar.fillRect(0, barHeight * 0.6, fillWidth, barHeight * 0.4);
      }
    }
  }

  destroy() {
    this.bar.destroy();
    if (this.cooldownBar) this.cooldownBar.destroy();
    this.entity.healthBar = undefined;
  }
}
