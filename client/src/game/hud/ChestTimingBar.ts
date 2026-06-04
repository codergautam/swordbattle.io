import HudComponent from './HudComponent';
import { EntityTypes, FlagTypes, InputTypes } from '../Types';

const half = { perfect: 0.025, great: 0.09, good: 0.20 };
const speed = 0.95;
const slowDecay = 0.55;
const activeMs = 2500;

const comboMax = 2.0;
const comboPerfect = 0.20;
const comboGreat = 0.12;
const comboGood = 0.05;

class ChestTimingBar extends HudComponent {
  private g!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private tierText!: Phaser.GameObjects.Text;
  private cursor = 0;
  private dir = 1;
  private center = 0.5;
  private slow = 0;
  private combo = 1;
  private curTier = 0;
  private lastHitTime = -1e9;
  private prevHit = false;
  private prevDestroy = false;
  private prevSwing = false;
  private shown = true;

  initialize() {
    this.g = this.hud.scene.add.graphics();
    const fontBase = { fontFamily: 'Rajdhani, sans-serif', stroke: '#000000', fontStyle: 'bold' };
    this.label = this.hud.scene.add.text(0, 0, '', {
      ...fontBase, fontSize: '30px', color: '#ffffff', strokeThickness: 6,
    }).setOrigin(0.5, 1).setAlpha(0);
    this.comboText = this.hud.scene.add.text(0, 0, '', {
      ...fontBase, fontSize: '24px', color: '#ffffff', strokeThickness: 5,
    }).setOrigin(0, 1).setAlpha(0);
    this.tierText = this.hud.scene.add.text(0, 0, '', {
      ...fontBase, fontSize: '22px', color: '#ffffff', strokeThickness: 5,
    }).setOrigin(1, 1).setAlpha(0);
    this.container = this.hud.scene.add.container(0, 0, [this.g, this.label, this.comboText, this.tierText]);
    this.container.setDepth(60);
    this.container.setVisible(false);
  }

  private geom() {
    const W = this.game.scale.width;
    const H = this.game.scale.height;
    const w = Math.min(560, W * 0.42);
    const h = 24;
    const cx = W / 2;
    const y = H - 120;
    return { w, h, cx, x0: cx - w / 2, y };
  }

  private sizeMul(): number {
    const frac = (this.combo - 1) / (comboMax - 1);
    return 1.15 * (1 - 0.25 * frac);
  }

  private zoneOf(cur: number): number {
    const d = Math.abs(cur - this.center);
    const s = this.sizeMul();
    if (d <= half.perfect * s) return 3;
    if (d <= half.great * s) return 2;
    if (d <= half.good * s) return 1;
    return 0;
  }

  private advanceBar() {
    this.cursor = 0; this.dir = 1; this.slow = 1;
    this.center = 0.15 + Math.random() * 0.7;
  }

  private hitTierChestNearby(self: any): number {
    const gs: any = this.game.gameState;
    const reach = (self.shape.radius || 100) * 2.8 + 240;
    let bestTier = 0, bestD = Infinity;
    for (const id in gs.entities) {
      const e: any = gs.entities[id];
      if (!e || e.type !== EntityTypes.Chest || (e.rarity ?? 0) < 3 || !e.shape) continue;
      const dx = e.shape.x - self.shape.x, dy = e.shape.y - self.shape.y;
      const r = reach + (e.size || 0) * 0.6;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r * r && d2 < bestD) { bestD = d2; bestTier = (e.rarity || 0) + 1; }
    }
    return bestTier;
  }

  update(dt: number) {
    const gs: any = this.game.gameState;
    const self: any = gs?.self?.entity;
    if (!gs) return;
    if (!self || !self.shape || !this.shown) {
      gs.chestBarActive = false; gs.chestBarZone = 0; gs.chestCombo = 1;
      this.container?.setVisible(false);
      return;
    }

    const now = performance.now();

    const hit = !!self.flags?.[FlagTypes.ChestHit];
    const destroyed = !!self.flags?.[FlagTypes.ChestDestroy];
    const hitEdge = (hit && !this.prevHit) || (destroyed && !this.prevDestroy);
    if (hitEdge) {
      const tier = this.hitTierChestNearby(self);
      if (tier > 0) {
        if (now - this.lastHitTime > activeMs) { this.advanceBar(); this.combo = 1; }
        this.curTier = tier;
        this.lastHitTime = now;
      }
    }
    this.prevHit = hit;
    this.prevDestroy = destroyed;

    const active = now - this.lastHitTime < activeMs;
    this.container?.setVisible(active);
    gs.chestBarActive = active;

    if (!active) { gs.chestBarZone = 0; gs.chestCombo = 1; this.combo = 1; this.prevSwing = false; return; }

    if (this.slow > 0) this.slow = Math.max(0, this.slow - (dt / 1000) / slowDecay);
    const sp = speed * (1 - 0.85 * this.slow);
    this.cursor += this.dir * sp * (dt / 1000);
    if (this.cursor >= 1) { this.cursor = 1; this.dir = -1; }
    else if (this.cursor <= 0) { this.cursor = 0; this.dir = 1; }

    gs.chestBarZone = this.zoneOf(this.cursor);
    gs.chestCombo = this.combo;

    const swing = this.game.controls.isInputDown(InputTypes.SwordSwing);
    if (swing && !this.prevSwing) {
      const z = gs.chestBarZone;
      if (z === 3) this.combo += comboPerfect;
      else if (z === 2) this.combo += comboGreat;
      else if (z === 1) this.combo += comboGood;
      else this.combo = 1;
      this.combo = Math.max(1, Math.min(comboMax, this.combo));
      this.showFeedback(z);
      this.advanceBar();
    }
    this.prevSwing = swing;

    this.draw();
  }

  private comboColor(): string {
    if (this.combo >= 1.85) return '#ffd23f';
    if (this.combo >= 1.5) return '#2ef2ff';
    if (this.combo >= 1.2) return '#6dff4f';
    return '#ffffff';
  }

  private draw() {
    const { w, h, x0, y } = this.geom();
    const g = this.g;
    const s = this.sizeMul();
    g.clear();
    g.fillStyle(0x12140f, 0.9);
    g.fillRoundedRect(x0 - 6, y - h / 2 - 6, w + 12, h + 12, 8);
    g.lineStyle(4, 0x000000, 0.95);
    g.strokeRoundedRect(x0 - 6, y - h / 2 - 6, w + 12, h + 12, 8);
    const fx = (f: number) => x0 + Math.max(0, Math.min(1, f)) * w;
    const zone = (half: number, color: number) => {
      const a = fx(this.center - half * s), b = fx(this.center + half * s);
      g.fillStyle(color, 0.95);
      g.fillRect(a, y - h / 2, b - a, h);
    };
    zone(half.good, 0x2ecc40);
    zone(half.great, 0x6dff4f);
    zone(half.perfect, 0x2ef2ff);
    const cxp = fx(this.cursor);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cxp - 3, y - h / 2 - 6, 6, h + 12);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(cxp - 3, y - h / 2 - 6, 6, h + 12);

    const labelY = y - h / 2 - 12;
    this.comboText.setText(`Combo x${this.combo.toFixed(2)}`).setColor(this.comboColor());
    this.comboText.setPosition(x0 - 6, labelY).setAlpha(1);
    this.tierText.setText(this.curTier > 0 ? `Tier ${this.curTier} Chest` : '');
    this.tierText.setPosition(x0 + w + 6, labelY).setAlpha(0.95);
  }

  private showFeedback(zone: number) {
    const { cx, y } = this.geom();
    const labels = ['Miss', 'Good', 'Great!', 'PERFECT!'];
    const colors = ['#c9c9cf', '#2ecc40', '#6dff4f', '#2ef2ff'];
    this.hud.scene.tweens.killTweensOf(this.label);
    this.label.setText(labels[zone]).setColor(colors[zone]);
    this.label.setPosition(cx, y - 44);
    this.label.setAlpha(1);
    this.hud.scene.tweens.add({
      targets: this.label,
      y: y - 78,
      alpha: 0,
      duration: 550,
      ease: 'Cubic.easeOut',
    });
  }

  setScale(scale: number) {
    this.scale = scale;
    this.container?.setScale(1);
  }

  setShow(show: boolean, force = true) {
    super.setShow(show, force);
    this.shown = show;
    if (!show) this.container?.setVisible(false);
  }
}

export default ChestTimingBar;
