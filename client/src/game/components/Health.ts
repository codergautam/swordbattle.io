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

let healthInstanceCounter = 0;

export class Health {
  game: Game;
  entity: BaseEntity;
  bar: Phaser.GameObjects.Sprite;
  cooldownBar: Phaser.GameObjects.Sprite | null = null;
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

  private _barGraphics: Phaser.GameObjects.Graphics;
  private _cooldownGraphics: Phaser.GameObjects.Graphics | null = null;
  private _barTextureKey: string;
  private _cooldownTextureKey: string;
  private _barBorderWidth: number = 0;
  private _cooldownBorderWidth: number = 0;
  private static readonly supersample = 2;

  constructor(entity: any, options: Partial<HealthOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options);

    this.game = entity.game;
    this.entity = entity;
    this.value = entity.healthPercent;
    this.alwaysHide = this.options.alwaysHide;

    const uid = `${Date.now().toString(36)}_${(healthInstanceCounter++).toString(36)}`;
    this._barTextureKey = `hbar_${uid}`;
    this._cooldownTextureKey = `hcb_${uid}`;

    this._barGraphics = this.game.make.graphics({ x: 0, y: 0 }, false);
    this.bar = this.game.add.sprite(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(29).setVisible(false);

    if (this.options.isPlayer) {
      this._cooldownGraphics = this.game.make.graphics({ x: 0, y: 0 }, false);
      this.cooldownBar = this.game.add.sprite(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(29).setVisible(false);
    }
  }

  private isInvisible(): boolean {
    const e = this.entity as any;
    return e.evolution === EvolutionTypes.Stalker && !!e.abilityActive;
  }

  update(dt: number) {
    if (this.alwaysHide) return;

    if (this.isInvisible()) {
      this.bar.setAlpha(0);
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
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

    const barCenterX = (this.entity.container.x - width / 2) + this.options.offsetX * scale;
    const barTopY = this.entity.container.y + this.options.offsetY * scale;

    if (!this.hidden && !this.internalHidden) {
      this.bar.setAlpha(1);
    }

    if (this.hidden || this.internalHidden) {
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
      this.bar.setPosition(barCenterX - this._barBorderWidth, barTopY - this._barBorderWidth);
      return;
    }

    const roundedValue = Math.round(this.value * 100) / 100;
    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    if (roundedValue !== this.lastDrawnValue || roundedWidth !== this.lastDrawnWidth || roundedHeight !== this.lastDrawnHeight) {
      this.lastDrawnValue = roundedValue;
      this.lastDrawnWidth = roundedWidth;
      this.lastDrawnHeight = roundedHeight;
      this.drawHealthBar(width, height, scale);
    }

    this.bar.setPosition(barCenterX - this._barBorderWidth, barTopY - this._barBorderWidth);
    this.bar.setVisible(true);

    if (this.options.isPlayer) {
      this.updateCooldownBar(dt, barCenterX, barTopY, width, height, scale);
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
    this._barBorderWidth = borderWidth;

    const totalW = width + borderWidth * 2;
    const totalH = height + borderWidth * 2;

    this._barGraphics.clear();

    this._barGraphics.fillStyle(0x000000, 0.9);
    this._barGraphics.fillRoundedRect(0, 0, totalW, totalH, borderWidth * 1.5);

    this._barGraphics.fillStyle(0x222222, 0.85);
    this._barGraphics.fillRoundedRect(borderWidth, borderWidth, width, height, borderWidth);

    const fillWidth = width * this.value;
    if (fillWidth > 0) {
      this._barGraphics.fillStyle(healthColor, 1);
      this._barGraphics.fillRoundedRect(borderWidth, borderWidth, fillWidth, height, borderWidth);

      this._barGraphics.fillStyle(0xffffff, 0.2);
      this._barGraphics.fillRoundedRect(borderWidth, borderWidth, fillWidth, height * 0.4, borderWidth);

      this._barGraphics.fillStyle(healthColorDark, 0.4);
      this._barGraphics.fillRect(borderWidth, borderWidth + height * 0.6, fillWidth, height * 0.4);
    }

    const ss = Health.supersample;
    const texW = Math.max(1, Math.ceil(totalW * ss));
    const texH = Math.max(1, Math.ceil(totalH * ss));
    if (this.game.textures.exists(this._barTextureKey)) {
      const src = this.game.textures.get(this._barTextureKey).getSourceImage() as HTMLCanvasElement;
      if (src && (src.width !== texW || src.height !== texH)) {
        this.game.textures.remove(this._barTextureKey);
      }
    }
    this._barGraphics.setScale(ss);
    this._barGraphics.generateTexture(this._barTextureKey, texW, texH);
    this._barGraphics.setScale(1);
    this.bar.setTexture(this._barTextureKey);
    this.bar.setDisplaySize(totalW, totalH);
  }

  private updateCooldownBar(dt: number, healthBarCenterX: number, healthBarTopY: number, healthWidth: number, healthHeight: number, scale: number) {
    if (!this.cooldownBar || !this._cooldownGraphics) return;

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

    const cooldownCenterX = healthBarCenterX;
    const cooldownTopY = healthBarTopY + healthHeight + gap;

    this.cooldownBar.setAlpha(this.bar.alpha);

    const roundedRatio = Math.round(ratio * 100) / 100;
    const roundedBarWidth = Math.round(barWidth);
    if (roundedRatio !== this.lastDrawnCooldownRatio || roundedBarWidth !== this.lastDrawnCooldownWidth || isReady !== this.lastDrawnCooldownReady) {
      this.lastDrawnCooldownRatio = roundedRatio;
      this.lastDrawnCooldownWidth = roundedBarWidth;
      this.lastDrawnCooldownReady = isReady;

      const fillColor = isReady ? 0xffdd00 : 0xcc4422;
      const fillColorDark = isReady ? 0xbb9900 : 0x882211;
      const borderWidth = Math.max(1.5, 2.5 * scale);
      this._cooldownBorderWidth = borderWidth;

      const totalW = barWidth + borderWidth * 2;
      const totalH = barHeight + borderWidth * 2;

      this._cooldownGraphics.clear();

      this._cooldownGraphics.fillStyle(0x000000, 0.85);
      this._cooldownGraphics.fillRoundedRect(0, 0, totalW, totalH, borderWidth * 1.5);

      this._cooldownGraphics.fillStyle(0x1a1a1a, 0.8);
      this._cooldownGraphics.fillRoundedRect(borderWidth, borderWidth, barWidth, barHeight, borderWidth);

      const fillWidth = barWidth * ratio;
      if (fillWidth > 0) {
        this._cooldownGraphics.fillStyle(fillColor, 1);
        this._cooldownGraphics.fillRoundedRect(borderWidth, borderWidth, fillWidth, barHeight, borderWidth);

        this._cooldownGraphics.fillStyle(0xffffff, 0.25);
        this._cooldownGraphics.fillRoundedRect(borderWidth, borderWidth, fillWidth, barHeight * 0.4, borderWidth);

        this._cooldownGraphics.fillStyle(fillColorDark, 0.4);
        this._cooldownGraphics.fillRect(borderWidth, borderWidth + barHeight * 0.6, fillWidth, barHeight * 0.4);
      }

      const ss = Health.supersample;
      const texW = Math.max(1, Math.ceil(totalW * ss));
      const texH = Math.max(1, Math.ceil(totalH * ss));
      if (this.game.textures.exists(this._cooldownTextureKey)) {
        const src = this.game.textures.get(this._cooldownTextureKey).getSourceImage() as HTMLCanvasElement;
        if (src && (src.width !== texW || src.height !== texH)) {
          this.game.textures.remove(this._cooldownTextureKey);
        }
      }
      this._cooldownGraphics.setScale(ss);
      this._cooldownGraphics.generateTexture(this._cooldownTextureKey, texW, texH);
      this._cooldownGraphics.setScale(1);
      this.cooldownBar.setTexture(this._cooldownTextureKey);
      this.cooldownBar.setDisplaySize(totalW, totalH);
    }

    this.cooldownBar.setPosition(cooldownCenterX - this._cooldownBorderWidth, cooldownTopY - this._cooldownBorderWidth);
    this.cooldownBar.setVisible(true);
  }

  destroy() {
    this.bar.destroy();
    if (this.cooldownBar) this.cooldownBar.destroy();
    this._barGraphics.destroy();
    this._cooldownGraphics?.destroy();
    if (this.game.textures.exists(this._barTextureKey)) this.game.textures.remove(this._barTextureKey);
    if (this.game.textures.exists(this._cooldownTextureKey)) this.game.textures.remove(this._cooldownTextureKey);
    this.entity.healthBar = undefined;
  }
}
