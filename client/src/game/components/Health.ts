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
  tierLabel: string | null;
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
  tierLabel: null,
};

export class Health {
  private static texRefs = new Map<string, number>();
  private static texFree = new Set<string>();
  private static readonly texCap = 384;

  private static releaseTex(key: string | null, game: Game) {
    if (!key) return;
    const refs = (Health.texRefs.get(key) || 1) - 1;
    if (refs <= 0) {
      Health.texRefs.delete(key);
      Health.texFree.add(key);
      Health.evictIfOverCap(game);
    } else {
      Health.texRefs.set(key, refs);
    }
  }

  private static evictIfOverCap(game: Game) {
    let total = Health.texRefs.size + Health.texFree.size;
    if (total <= Health.texCap) return;
    for (const key of Health.texFree) {
      if (total <= Health.texCap) break;
      Health.texFree.delete(key);
      if (game.textures.exists(key)) game.textures.remove(key);
      total--;
    }
  }

  private acquireTex(key: string, rasterize: () => void) {
    const refs = Health.texRefs.get(key);
    if (refs !== undefined) { Health.texRefs.set(key, refs + 1); return; }
    if (Health.texFree.has(key) && this.game.textures.exists(key)) {
      Health.texFree.delete(key);
      Health.texRefs.set(key, 1);
      return;
    }
    rasterize();
    Health.texRefs.set(key, 1);
    Health.evictIfOverCap(this.game);
  }

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
  private curBarKey: string | null = null;
  private curCooldownKey: string | null = null;
  private barBorderWidth: number = 0;
  private cooldownBorderWidth: number = 0;
  private tierText: Phaser.GameObjects.Text | null = null;
  private static readonly supersample = 2;
  private flashFill: Phaser.GameObjects.Image | null = null;
  private flashLevel = 0;
  private lastTargetHp = 1;

  private ensureFlashFill(): Phaser.GameObjects.Image {
    if (!this.flashFill) {
      this.flashFill = this.game.add.image(0, 0, '__WHITE')
        .setOrigin(0, 0).setDepth(29.5).setVisible(false);
    }
    return this.flashFill;
  }

  constructor(entity: any, options: Partial<HealthOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options);

    this.game = entity.game;
    this.entity = entity;
    this.value = entity.healthPercent;
    this.alwaysHide = this.options.alwaysHide;

    this._barGraphics = this.game.make.graphics({ x: 0, y: 0 }, false);
    this.bar = this.game.add.sprite(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(29).setVisible(false);

    if (this.options.isPlayer) {
      this._cooldownGraphics = this.game.make.graphics({ x: 0, y: 0 }, false);
      this.cooldownBar = this.game.add.sprite(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(29).setVisible(false);
    }

    if (this.options.tierLabel) {
      this.tierText = this.game.add.text(0, 0, this.options.tierLabel, {
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5, 1).setDepth(29).setVisible(false);
    }
  }

  private isInvisible(): boolean {
    const e = this.entity as any;
    return e.evolution === EvolutionTypes.Stalker && !!e.abilityActive;
  }

  update(dt: number) {
    if (this.alwaysHide) return;

    const cont = this.entity.container;
    if (cont && cont.visible === false) {
      if (this.bar.visible) this.bar.setVisible(false);
      if (this.cooldownBar && this.cooldownBar.visible) this.cooldownBar.setVisible(false);
      if (this.tierText && this.tierText.visible) this.tierText.setVisible(false);
      if (this.flashFill && this.flashFill.visible) this.flashFill.setVisible(false);
      return;
    }

    if (this.isInvisible()) {
      this.bar.setAlpha(0);
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
      if (this.tierText) this.tierText.setAlpha(0);
      this.lastDrawnValue = -1;
      this.lastDrawnCooldownRatio = -1;
      return;
    }

    const targetHp = this.entity.healthPercent;
    if (targetHp < this.lastTargetHp - 0.00001) this.flashLevel = 1;
    this.lastTargetHp = targetHp;

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

    if (this.flashLevel > 0) {
      this.flashLevel = Math.max(0, this.flashLevel - dt / 130);
      const fillW = width * this.value;
      if (fillW > 1) {
        const fo = this.ensureFlashFill();
        fo.setPosition(barCenterX, barTopY);
        fo.setDisplaySize(fillW, height);
        fo.setAlpha(Math.min(1, this.flashLevel) * 0.85);
        fo.setVisible(true);
      } else if (this.flashFill) {
        this.flashFill.setVisible(false);
      }
    } else if (this.flashFill && this.flashFill.visible) {
      this.flashFill.setVisible(false);
    }

    if (!this.hidden && !this.internalHidden) {
      this.bar.setAlpha(1);
    }

    if (this.hidden || this.internalHidden) {
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
      if (this.tierText) this.tierText.setAlpha(0);
      this.bar.setPosition(barCenterX - this.barBorderWidth, barTopY - this.barBorderWidth);
      return;
    }

    const roundedValue = Math.round(this.value * 33) / 33;
    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    if (roundedValue !== this.lastDrawnValue || roundedWidth !== this.lastDrawnWidth || roundedHeight !== this.lastDrawnHeight) {
      this.lastDrawnValue = roundedValue;
      this.lastDrawnWidth = roundedWidth;
      this.lastDrawnHeight = roundedHeight;
      this.drawHealthBar(width, height, scale);
    }

    this.bar.setPosition(barCenterX - this.barBorderWidth, barTopY - this.barBorderWidth);
    this.bar.setVisible(true);

    if (this.tierText) {
      const labelScale = Math.min(2.8, Math.max(1, Math.sqrt(scale)));
      const labelX = barCenterX + width / 2 - this.barBorderWidth;
      const labelY = barTopY - this.barBorderWidth - 4;
      this.tierText.setScale(labelScale);
      this.tierText.setPosition(labelX, labelY);
      this.tierText.setAlpha(this.bar.alpha);
      this.tierText.setVisible(true);
    }

    if (this.options.isPlayer) {
      this.updateCooldownBar(dt, barCenterX, barTopY, width, height, scale);
    }
  }

  private drawHealthBar(width: number, height: number, scale: number) {
    const rw = Math.max(1, Math.round(width));
    const rh = Math.max(1, Math.round(height));
    const vb = Math.round(this.value * 33);
    const vv = vb / 33;
    let tier = 0;
    if (vv < 0.3) tier = 2;
    else if (vv < 0.5) tier = 1;

    const bbw = Math.round(Math.max(2, 3 * scale) * 4) / 4;
    this.barBorderWidth = bbw;
    const totalW = rw + bbw * 2;
    const totalH = rh + bbw * 2;

    const key = `h|${tier}|${vb}|${rw}|${rh}|${Math.round(bbw * 4)}`;
    if (key !== this.curBarKey) {
      this.acquireTex(key, () => this.rasterizeBar(this._barGraphics, key, rw, rh, bbw, vv, tier, false));
      Health.releaseTex(this.curBarKey, this.game);
      this.curBarKey = key;
      this.bar.setTexture(key);
    }
    this.bar.setDisplaySize(totalW, totalH);
  }

  private rasterizeBar(
    g: Phaser.GameObjects.Graphics, key: string,
    width: number, height: number, borderWidth: number,
    value: number, tier: number, cooldown: boolean,
  ) {
    const totalW = width + borderWidth * 2;
    const totalH = height + borderWidth * 2;
    g.clear();

    if (!cooldown) {
      let fill = 0x44dd44;
      if (tier === 2) fill = 0xee3333; else if (tier === 1) fill = 0xeecc33; else if (tier === 3) fill = 0xffffff;
      g.fillStyle(0x000000, 0.9);
      g.fillRoundedRect(0, 0, totalW, totalH, borderWidth * 1.5);
      g.fillStyle(0x222222, 0.85);
      g.fillRoundedRect(borderWidth, borderWidth, width, height, borderWidth);
      const fillWidth = width * value;
      if (fillWidth > 0) {
        g.fillStyle(fill, 1);
        g.fillRoundedRect(borderWidth, borderWidth, fillWidth, height, borderWidth);
        g.fillStyle(0xffffff, 0.2);
        g.fillRoundedRect(borderWidth, borderWidth, fillWidth, height * 0.4, borderWidth);
      }
    } else {
      const fill = tier === 1 ? 0xffdd00 : 0xcc4422;
      g.fillStyle(0x000000, 0.85);
      g.fillRoundedRect(0, 0, totalW, totalH, borderWidth * 1.5);
      g.fillStyle(0x1a1a1a, 0.8);
      g.fillRoundedRect(borderWidth, borderWidth, width, height, borderWidth);
      const fillWidth = width * value;
      if (fillWidth > 0) {
        g.fillStyle(fill, 1);
        g.fillRoundedRect(borderWidth, borderWidth, fillWidth, height, borderWidth);
        g.fillStyle(0xffffff, 0.25);
        g.fillRoundedRect(borderWidth, borderWidth, fillWidth, height * 0.4, borderWidth);
      }
    }

    const ss = Health.supersample;
    const texW = Math.max(1, Math.ceil(totalW * ss));
    const texH = Math.max(1, Math.ceil(totalH * ss));
    if (this.game.textures.exists(key)) this.game.textures.remove(key);
    g.setScale(ss);
    g.generateTexture(key, texW, texH);
    g.setScale(1);
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

    const roundedRatio = Math.round(ratio * 20) / 20;
    const roundedBarWidth = Math.round(barWidth);
    if (roundedRatio !== this.lastDrawnCooldownRatio || roundedBarWidth !== this.lastDrawnCooldownWidth || isReady !== this.lastDrawnCooldownReady) {
      this.lastDrawnCooldownRatio = roundedRatio;
      this.lastDrawnCooldownWidth = roundedBarWidth;
      this.lastDrawnCooldownReady = isReady;

      const tier = isReady ? 1 : 0;
      const bw = Math.round(Math.max(1.5, 2.5 * scale) * 4) / 4;
      this.cooldownBorderWidth = bw;
      const rbw = Math.max(1, Math.round(barWidth));
      const rbh = Math.max(1, Math.round(barHeight));
      const totalW = rbw + bw * 2;
      const totalH = rbh + bw * 2;
      const vb = Math.round(roundedRatio * 20);

      const key = `c|${tier}|${vb}|${rbw}|${rbh}|${Math.round(bw * 4)}`;
      if (key !== this.curCooldownKey) {
        this.acquireTex(key, () => this.rasterizeBar(this._cooldownGraphics!, key, rbw, rbh, bw, roundedRatio, tier, true));
        Health.releaseTex(this.curCooldownKey, this.game);
        this.curCooldownKey = key;
        this.cooldownBar.setTexture(key);
      }
      this.cooldownBar.setDisplaySize(totalW, totalH);
    }

    this.cooldownBar.setPosition(cooldownCenterX - this.cooldownBorderWidth, cooldownTopY - this.cooldownBorderWidth);
    this.cooldownBar.setVisible(true);
  }

  destroy() {
    this.bar.destroy();
    if (this.cooldownBar) this.cooldownBar.destroy();
    if (this.tierText) { this.tierText.destroy(); this.tierText = null; }
    if (this.flashFill) { this.flashFill.destroy(); this.flashFill = null; }
    this._barGraphics.destroy();
    this._cooldownGraphics?.destroy();
    Health.releaseTex(this.curBarKey, this.game);
    Health.releaseTex(this.curCooldownKey, this.game);
    this.curBarKey = null;
    this.curCooldownKey = null;
    this.entity.healthBar = undefined;
  }
}
