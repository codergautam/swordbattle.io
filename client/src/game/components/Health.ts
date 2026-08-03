import { BaseEntity } from '../entities/BaseEntity';
import { EvolutionTypes, FlagTypes } from '../Types';
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

const fillGreen = 0x44dd44;
const fillYellow = 0xeecc33;
const fillRed = 0xee3333;
const cdReady = 0xffdd00;
const cdCharging = 0xcc4422;

export class Health {
  private static framesBaked = new Set<string>();
  private static solidsBaked = new Set<string>();

  private static ensureSolid(game: Game, color: number): string {
    const key = `hsolid|${color}`;
    if (Health.solidsBaked.has(key) && game.textures.exists(key)) return key;
    const canvas = document.createElement('canvas');
    canvas.width = 4; canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 4, 4);
    }
    (game.textures as any).addCanvas(key, canvas);
    Health.solidsBaked.add(key);
    return key;
  }

  private static ensureFrame(game: Game, kind: 'h' | 'c', w0: number, h0: number, b0: number): string {
    const key = `${kind}frame|${Math.round(w0)}|${Math.round(h0)}|${Math.round(b0 * 4)}`;
    if (Health.framesBaked.has(key) && game.textures.exists(key)) return key;
    const ss = 3;
    const g = game.make.graphics({ x: 0, y: 0 }, false);
    const totalW = w0 + b0 * 2;
    const totalH = h0 + b0 * 2;
    g.fillStyle(0x000000, kind === 'h' ? 0.9 : 0.85);
    g.fillRoundedRect(0, 0, totalW, totalH, b0 * 1.5);
    g.fillStyle(kind === 'h' ? 0x222222 : 0x1a1a1a, kind === 'h' ? 0.85 : 0.8);
    g.fillRoundedRect(b0, b0, w0, h0, b0);
    g.setScale(ss);
    g.generateTexture(key, Math.max(1, Math.ceil(totalW * ss)), Math.max(1, Math.ceil(totalH * ss)));
    g.destroy();
    Health.framesBaked.add(key);
    return key;
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
  private cooldownMax = 0;
  private smoothCooldownRatio = 1;
  private lastRawCooldown = 0;

  private fillImg: Phaser.GameObjects.Image;
  private glossImg: Phaser.GameObjects.Image;
  private cooldownFillImg: Phaser.GameObjects.Image | null = null;
  private lastFillColor = -1;
  private lastCooldownColor = -1;
  private barBorderWidth: number = 0;
  private cooldownBorderWidth: number = 0;
  private tierText: Phaser.GameObjects.Text | null = null;
  private flashFill: Phaser.GameObjects.Image | null = null;
  private flashLevel = 0;
  private lastTargetHp = 1;
  private comboGraphic: Phaser.GameObjects.Graphics | null = null;
  private comboText: Phaser.GameObjects.Text | null = null;
  private lastDrawnCombo = -1;
  private lastDrawnComboSize = -1;
  private lastDrawnComboLocked = false;
  private static readonly comboMax = 5;
  private wasStalkerInvisible = false;

  private depthBase: number;

  private ensureFlashFill(): Phaser.GameObjects.Image {
    if (!this.flashFill) {
      this.flashFill = this.game.add.image(0, 0, '__WHITE')
        .setOrigin(0, 0).setDepth(this.depthBase + 9e-5).setVisible(false);
    }
    return this.flashFill;
  }

  constructor(entity: any, options: Partial<HealthOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options);

    this.game = entity.game;
    this.entity = entity;
    this.value = typeof entity.healthPercent === 'number' ? entity.healthPercent : 1;
    this.lastTargetHp = this.value;
    this.alwaysHide = this.options.alwaysHide;

    this.depthBase = 29
      + (this.options.isPlayer ? 0.5 : 0)
      + ((Number((entity as any).id) || 0) % 497) * 1e-3;

    const frameKey = Health.ensureFrame(this.game, 'h', this.options.width, this.options.height, 3);
    this.bar = this.game.add.sprite(0, 0, frameKey).setOrigin(0, 0).setDepth(this.depthBase).setVisible(false);
    const greenKey = Health.ensureSolid(this.game, fillGreen);
    this.fillImg = this.game.add.image(0, 0, greenKey).setOrigin(0, 0).setDepth(this.depthBase + 2e-5).setVisible(false);
    this.lastFillColor = fillGreen;
    this.glossImg = this.game.add.image(0, 0, '__WHITE').setOrigin(0, 0).setDepth(this.depthBase + 4e-5).setVisible(false);

    if (this.options.isPlayer) {
      const cdFrameKey = Health.ensureFrame(this.game, 'c', this.options.width, this.options.height * 0.5, 2.5);
      this.cooldownBar = this.game.add.sprite(0, 0, cdFrameKey).setOrigin(0, 0).setDepth(this.depthBase + 6e-5).setVisible(false);
      this.cooldownFillImg = this.game.add.image(0, 0, Health.ensureSolid(this.game, cdCharging))
        .setOrigin(0, 0).setDepth(this.depthBase + 8e-5).setVisible(false);
    }

    if (this.options.tierLabel) {
      this.tierText = this.game.add.text(0, 0, this.options.tierLabel, {
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5, 1).setDepth(this.depthBase + 9.5e-5).setVisible(false);
    }
  }

  private isInvisible(): boolean {
    const e = this.entity as any;
    return e.evolution === EvolutionTypes.Stalker && !!e.abilityActive;
  }

  resyncAfterHidden() {
    const hp = this.entity?.healthPercent;
    if (typeof hp !== 'number') return;
    this.value = hp;
    this.lastTargetHp = hp;
    this.flashLevel = 0;
    if (this.flashFill) this.flashFill.setVisible(false);
  }

  getFadeTargets(): any[] {
    const t: any[] = [this.fillImg, this.glossImg];
    if (this.cooldownFillImg) t.push(this.cooldownFillImg);
    if (this.flashFill) t.push(this.flashFill);
    if (this.tierText) t.push(this.tierText);
    if (this.comboGraphic) t.push(this.comboGraphic);
    if (this.comboText) t.push(this.comboText);
    return t;
  }

  private hideBarPieces() {
    if (this.fillImg.visible) this.fillImg.setVisible(false);
    if (this.glossImg.visible) this.glossImg.setVisible(false);
    if (this.cooldownFillImg && this.cooldownFillImg.visible) this.cooldownFillImg.setVisible(false);
  }

  update(dt: number) {
    if (this.alwaysHide) return;

    const cont = this.entity.container;
    if (cont && cont.visible === false) {
      const hp = this.entity.healthPercent;
      if (typeof hp === 'number' && Number.isFinite(hp)) { this.value = hp; this.lastTargetHp = hp; }
      this.flashLevel = 0;
      if (this.bar.visible) this.bar.setVisible(false);
      if (this.cooldownBar && this.cooldownBar.visible) this.cooldownBar.setVisible(false);
      if (this.tierText && this.tierText.visible) this.tierText.setVisible(false);
      if (this.flashFill && this.flashFill.visible) this.flashFill.setVisible(false);
      this.hideBarPieces();
      this.hideCombo();
      return;
    }

    if (this.isInvisible()) {
      this.bar.setAlpha(0);
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
      if (this.tierText) this.tierText.setAlpha(0);
      this.hideBarPieces();
      this.hideCombo();
      this.flashLevel = 0;
      if (this.flashFill && this.flashFill.visible) this.flashFill.setVisible(false);
      this.wasStalkerInvisible = true;
      return;
    }
    if (this.wasStalkerInvisible) {
      this.wasStalkerInvisible = false;
      const a = (this.hidden || this.internalHidden) ? 0 : 1;
      this.bar.setAlpha(a);
      if (this.cooldownBar) this.cooldownBar.setAlpha(a);
      if (this.tierText) this.tierText.setAlpha(a);
    }

    let targetHp = this.entity.healthPercent;
    if (typeof targetHp !== 'number' || !Number.isFinite(targetHp)) {
      targetHp = Number.isFinite(this.value) ? this.value : 1;
    }
    if (!Number.isFinite(this.value)) this.value = targetHp;

    if (targetHp < this.lastTargetHp - 0.00001) this.flashLevel = 1;
    this.lastTargetHp = targetHp;

    this.value = Phaser.Math.Linear(this.value, targetHp, 1 - Math.exp(-dt / 60));

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
    const bbw = Math.max(2, 3 * scale);
    this.barBorderWidth = bbw;

    const barLeftX = (this.entity.container.x - width / 2) + this.options.offsetX * scale;
    const barTopY = this.entity.container.y + this.options.offsetY * scale;

    if (this.flashLevel > 0) {
      this.flashLevel = Math.max(0, this.flashLevel - dt / 130);
      const fillW = width * this.value;
      if (fillW > 1) {
        const fo = this.ensureFlashFill();
        fo.setPosition(barLeftX, barTopY);
        fo.setDisplaySize(fillW, height);
        fo.setAlpha(Math.min(1, this.flashLevel) * 0.85 * this.bar.alpha);
        fo.setVisible(true);
      } else if (this.flashFill) {
        this.flashFill.setVisible(false);
      }
    } else if (this.flashFill && this.flashFill.visible) {
      this.flashFill.setVisible(false);
    }

    this.bar.setPosition(barLeftX - bbw, barTopY - bbw);
    this.bar.setDisplaySize(width + bbw * 2, height + bbw * 2);
    this.bar.setVisible(true);

    const v = Math.max(0, Math.min(1, this.value));
    const insetX = 3 * ((width + bbw * 2) / (this.options.width + 6));
    const insetY = 3 * ((height + bbw * 2) / (this.options.height + 6));
    const innerLeft = barLeftX - bbw + insetX;
    const innerTop = barTopY - bbw + insetY;
    const innerW = width + bbw * 2 - insetX * 2;
    const innerH = height + bbw * 2 - insetY * 2;
    const fillW = innerW * v;
    let color = fillGreen;
    if (v < 0.3) color = fillRed;
    else if (v < 0.5) color = fillYellow;
    if (color !== this.lastFillColor) {
      this.lastFillColor = color;
      (this.fillImg as any).setTexture(Health.ensureSolid(this.game, color));
    }
    if (fillW >= 0.5 && this.bar.alpha > 0.01) {
      this.fillImg.setPosition(innerLeft, innerTop);
      this.fillImg.setDisplaySize(fillW, innerH);
      this.fillImg.setAlpha(this.bar.alpha);
      this.fillImg.setVisible(true);
      this.glossImg.setPosition(innerLeft, innerTop);
      this.glossImg.setDisplaySize(fillW, innerH * 0.4);
      this.glossImg.setAlpha(this.bar.alpha * 0.2);
      this.glossImg.setVisible(true);
    } else {
      if (this.fillImg.visible) this.fillImg.setVisible(false);
      if (this.glossImg.visible) this.glossImg.setVisible(false);
    }

    if (this.hidden || this.internalHidden) {
      if (this.cooldownBar) this.cooldownBar.setAlpha(0);
      if (this.cooldownFillImg && this.cooldownFillImg.visible) this.cooldownFillImg.setVisible(false);
      if (this.tierText) this.tierText.setAlpha(0);
      this.hideCombo();
      if (this.flashFill && this.flashFill.visible) this.flashFill.setVisible(false);
      return;
    }

    if (this.tierText) {
      const labelScale = Math.min(2.8, Math.max(1, Math.sqrt(scale)));
      const labelX = barLeftX + width / 2 - bbw;
      const labelY = barTopY - bbw - 4;
      this.tierText.setScale(labelScale);
      this.tierText.setPosition(labelX, labelY);
      this.tierText.setAlpha(this.bar.alpha);
      this.tierText.setVisible(true);
    }

    if (this.options.isPlayer) {
      this.updateCombo(barLeftX, barTopY, width, height, scale);
      this.updateFighterBadge(barLeftX, barTopY, width, height, scale);
      this.updateCooldownBar(dt, barLeftX, barTopY, width, height, scale);
    }
  }

  private fighterBadge: Phaser.GameObjects.Image | null = null;
  private updateFighterBadge(barLeftX: number, barTopY: number, width: number, height: number, scale: number) {
    const e = this.entity as any;
    const active = e.evolution === EvolutionTypes.Fighter && e.flags && !!e.flags[FlagTypes.FighterBoost];
    if (!active) { if (this.fighterBadge) this.fighterBadge.setVisible(false); return; }
    if (!this.fighterBadge) {
      this.fighterBadge = this.game.add.image(0, 0, 'fighterBadge')
        .setOrigin(0.5, 0.5).setDepth(this.depthBase + 9.6e-5);
    }
    const r = Math.max(12, 21 * scale);
    const cx = barLeftX + width + this.barBorderWidth + 14 * scale + r;
    const cy = barTopY + height / 2;
    this.fighterBadge.setPosition(cx, cy).setDisplaySize(r * 2, r * 2).setAlpha(this.bar.alpha).setVisible(true);
  }

  private hideCombo() {
    if (this.fighterBadge && this.fighterBadge.visible) this.fighterBadge.setVisible(false);
    if (this.comboGraphic && this.comboGraphic.visible) this.comboGraphic.setVisible(false);
    if (this.comboText && this.comboText.visible) this.comboText.setVisible(false);
  }

  private updateCombo(barLeftX: number, barTopY: number, width: number, height: number, scale: number) {
    const e = this.entity as any;
    if (e.evolution !== EvolutionTypes.Elite) {
      this.hideCombo();
      return;
    }

    const rawCombo = e.flags ? Number(e.flags[FlagTypes.EliteCombo]) || 0 : 0;
    const combo = Math.max(0, Math.min(Health.comboMax, rawCombo));
    const locked = !!e.abilityActive;
    const r = Math.max(12, 21 * scale);
    const sizeBucket = Math.round(r);

    if (!this.comboGraphic) {
      this.comboGraphic = this.game.add.graphics();
      this.comboGraphic.setDepth(this.depthBase + 9.6e-5);
      this.comboText = this.game.add.text(0, 0, '0', {
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5, 0.5).setDepth(this.depthBase + 9.8e-5);
    }

    if (combo !== this.lastDrawnCombo || sizeBucket !== this.lastDrawnComboSize || locked !== this.lastDrawnComboLocked) {
      this.lastDrawnCombo = combo;
      this.lastDrawnComboSize = sizeBucket;
      this.lastDrawnComboLocked = locked;
      this.drawComboShape(combo, r, locked);
      this.comboText!.setText(String(combo));
      this.comboText!.setColor(locked ? '#a5f3ff' : (combo >= Health.comboMax ? '#ffe066' : '#ffffff'));
    }

    const cx = barLeftX + width + this.barBorderWidth + 14 * scale + r;
    const cy = barTopY + height / 2;
    this.comboGraphic.setPosition(cx, cy);
    this.comboGraphic.setAlpha(this.bar.alpha);
    this.comboGraphic.setVisible(true);
    this.comboText!.setPosition(cx, cy);
    this.comboText!.setScale(Math.max(0.55, r / 21 * 0.72));
    this.comboText!.setAlpha(this.bar.alpha);
    this.comboText!.setVisible(true);
  }

  private drawComboShape(combo: number, r: number, locked = false) {
    const g = this.comboGraphic!;
    const outline = Math.max(2, r * 0.12);
    g.clear();
    g.fillStyle(locked ? 0x2ef2ff : 0xffdd00, 1);
    g.lineStyle(outline, 0x000000, 1);

    if (combo === 0) {
      g.fillCircle(0, 0, r);
      g.strokeCircle(0, 0, r);
      return;
    }
    if (combo === 1) {
      const s = r * 1.7;
      g.fillRect(-s / 2, -s / 2, s, s);
      g.strokeRect(-s / 2, -s / 2, s, s);
      return;
    }

    if (combo === 2) {
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI / 2 + (i / 3) * Math.PI * 2;
        const x = Math.cos(angle) * r * 1.1;
        const y = Math.sin(angle) * r * 1.1;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
      return;
    }

    const points = combo;
    const inner = r * (combo === 3 ? 0.4 : 0.48);
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
      const rad = (i % 2 === 0) ? r * 1.12 : inner;
      const x = Math.cos(angle) * rad;
      const y = Math.sin(angle) * rad;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private updateCooldownBar(dt: number, barLeftX: number, barTopY: number, healthWidth: number, healthHeight: number, scale: number) {
    if (!this.cooldownBar || !this.cooldownFillImg) return;

    const e = this.entity as any;
    const rawCooldown: number = e.swordFlyingCooldown ?? 0;

    if (rawCooldown > this.lastRawCooldown + 0.05) {
      this.cooldownMax = Math.max(rawCooldown, 0.001);
    }
    if (rawCooldown > this.cooldownMax) this.cooldownMax = rawCooldown;
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
    const bw = Math.max(1.5, 2.5 * scale);
    this.cooldownBorderWidth = bw;

    const cooldownLeftX = barLeftX;
    const cooldownTopY = barTopY + healthHeight + gap;

    this.cooldownBar.setAlpha(this.bar.alpha);
    this.cooldownBar.setPosition(cooldownLeftX - bw, cooldownTopY - bw);
    this.cooldownBar.setDisplaySize(barWidth + bw * 2, barHeight + bw * 2);
    this.cooldownBar.setVisible(true);

    const e2 = this.entity as any;
    const comboActive = !!(e2.flags && e2.flags[FlagTypes.ArcherCombo]);
    const color = isReady ? (comboActive ? 0x2ef2ff : cdReady) : cdCharging;
    if (color !== this.lastCooldownColor) {
      this.lastCooldownColor = color;
      (this.cooldownFillImg as any).setTexture(Health.ensureSolid(this.game, color));
    }
    const insetX = 2.5 * ((barWidth + bw * 2) / (this.options.width + 5));
    const insetY = 2.5 * ((barHeight + bw * 2) / (this.options.height * 0.5 + 5));
    const innerW = barWidth + bw * 2 - insetX * 2;
    const innerH = barHeight + bw * 2 - insetY * 2;
    const fillW = innerW * ratio;
    if (fillW >= 0.5) {
      this.cooldownFillImg.setPosition(cooldownLeftX - bw + insetX, cooldownTopY - bw + insetY);
      this.cooldownFillImg.setDisplaySize(fillW, innerH);
      this.cooldownFillImg.setAlpha(this.cooldownBar.alpha);
      this.cooldownFillImg.setVisible(true);
    } else if (this.cooldownFillImg.visible) {
      this.cooldownFillImg.setVisible(false);
    }
  }

  destroy() {
    this.bar.destroy();
    this.fillImg.destroy();
    this.glossImg.destroy();
    if (this.cooldownBar) this.cooldownBar.destroy();
    if (this.cooldownFillImg) { this.cooldownFillImg.destroy(); this.cooldownFillImg = null; }
    if (this.tierText) { this.tierText.destroy(); this.tierText = null; }
    if (this.flashFill) { this.flashFill.destroy(); this.flashFill = null; }
    if (this.comboGraphic) { this.comboGraphic.destroy(); this.comboGraphic = null; }
    if (this.comboText) { this.comboText.destroy(); this.comboText = null; }
    if (this.fighterBadge) { this.fighterBadge.destroy(); this.fighterBadge = null; }
    this.entity.healthBar = undefined;
  }
}
