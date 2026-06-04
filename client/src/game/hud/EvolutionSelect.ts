import HudComponent from './HudComponent';
import { Evolutions } from '../Evolutions';
import { getTheme } from '../../hudTheme';
import { drawPanel } from './panel';

const discoveredKey = 'swordbattle:discoveredEvolutions';

function getDiscoveredEvolutions(): Set<string> {
  try {
    const raw = localStorage.getItem(discoveredKey);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}
function markEvolutionDiscovered(evolId: string): void {
  const d = getDiscoveredEvolutions();
  d.add(evolId);
  try { localStorage.setItem(discoveredKey, JSON.stringify([...d])); } catch (e) {}
}

const font = 'Rajdhani, sans-serif';
const cardW = 96;
const cardH = 106;
const cardGap = 18;
const PREVIEW = 58;
const titleY = 12;
const cardsTop = 44;
const pad = 12;
const tipW = 250;

class EvolutionSelect extends HudComponent {
  private bg!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private cardsC!: Phaser.GameObjects.Container;
  private tipC!: Phaser.GameObjects.Container;
  private tipBg!: Phaser.GameObjects.Graphics;
  private tipName!: Phaser.GameObjects.Text;
  private tipDesc!: Phaser.GameObjects.Text;
  private tipAbil!: Phaser.GameObjects.Text;
  private tipW = 0;
  private tipH = 0;
  private hoverKey: string | null = null;
  minimized = false;
  updateList = false;
  private cards: { container: Phaser.GameObjects.Container; panel: Phaser.GameObjects.Graphics; key: string }[] = [];

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;
    const t = getTheme();

    this.bg = scene.add.graphics();
    this.title = scene.add.text(0, titleY, 'Evolutions', {
      fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: t.accent, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleMinimize());

    this.cardsC = scene.add.container(0, 0);
    this.container = scene.add.container(0, 0, [this.bg, this.title, this.cardsC]);
    this.container.setDepth(50).setVisible(false);
    this.hud.add(this.container);

    this.tipBg = scene.add.graphics();
    this.tipName = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0);
    this.tipDesc = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '15px', color: '#d4d4d8', wordWrap: { width: tipW - 24 } }).setOrigin(0, 0);
    this.tipAbil = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '15px', fontStyle: 'bold', color: '#ffcf33' }).setOrigin(0, 0);
    this.tipC = scene.add.container(0, 0, [this.tipBg, this.tipName, this.tipDesc, this.tipAbil]).setDepth(300).setVisible(false);
  }

  resize() {
    if (!this.container) return;
    this.container.x = this.game.scale.width / 2;
    this.container.y = 0;
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.cardsC.setVisible(!this.minimized);
    if (this.minimized) this.hideTip();
    this.redrawBg();
  }

  selectEvolution(type: any) {
    markEvolutionDiscovered(String(type));
    this.game.gameState.selectedEvolution = type;
    this.game.gameState.self.entity!.possibleEvolutions = {};
    this.updateList = true;
    this.hideTip();
  }

  private hideTip() {
    this.hoverKey = null;
    this.tipC?.setVisible(false);
    for (const c of this.cards) this.drawCard(c, false);
  }

  private showTip(evolKey: string) {
    const e = Evolutions[evolKey];
    if (!e) return;
    this.hoverKey = evolKey;
    const padx = 12, pady = 9, gap = 4;
    this.tipName.setText(e[0]).setPosition(padx, pady);
    this.tipDesc.setText(e[4]).setPosition(padx, pady + this.tipName.height + gap);
    this.tipAbil.setText('Ability: ' + e[5]).setPosition(padx, this.tipDesc.y + this.tipDesc.height + gap);
    const w = Math.min(tipW, Math.max(this.tipName.width, this.tipDesc.width, this.tipAbil.width) + padx * 2);
    const h = this.tipAbil.y + this.tipAbil.height + pady;
    this.tipBg.clear();
    this.tipBg.fillStyle(0x0b0b0d, 0.94);
    this.tipBg.fillRoundedRect(0, 0, w, h, 7);
    this.tipBg.lineStyle(1.5, 0x000000, 0.9);
    this.tipBg.strokeRoundedRect(0, 0, w, h, 7);
    this.tipW = w; this.tipH = h;
    this.tipC.setVisible(true);
    for (const c of this.cards) this.drawCard(c, c.key === evolKey);
  }

  private drawCard(card: { panel: Phaser.GameObjects.Graphics; key: string }, hot: boolean) {
    const g = card.panel;
    g.clear();
    drawPanel(g, -cardW / 2, -cardH / 2, cardW, cardH, { radius: 10 });
    if (hot) {
      const t = getTheme();
      g.fillStyle(t.border, 0.16);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
      g.lineStyle(3, 0xffffff, 0.95);
      g.strokeRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH - 4, 8);
    }
  }

  private redrawBg() {
    const count = this.cards.length;
    const rowW = count > 0 ? count * cardW + (count - 1) * cardGap : 240;
    const w = rowW + pad * 2;
    const bottom = this.minimized ? cardsTop - 8 : cardsTop + cardH + pad;
    this.bg.clear();
    drawPanel(this.bg, -w / 2, -24, w, bottom + 24, { radius: 14 });
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!this.container || !player) return;

    if (player.coins === 0) {
      if (this.container.visible) this.container.setVisible(false);
      this.hideTip();
      this.minimized = false;
      return;
    }

    if (this.hoverKey && this.tipC.visible) {
      const p = this.hud.scene!.input.activePointer;
      const sw = this.game.scale.width, sh = this.game.scale.height;
      let tx = p.x + 16, ty = p.y + 16;
      if (tx + this.tipW > sw - 4) tx = p.x - this.tipW - 16;
      if (ty + this.tipH > sh - 4) ty = sh - this.tipH - 6;
      this.tipC.setPosition(tx, ty);
    }

    if (!this.updateList) return;
    this.updateList = false;
    if (!player.possibleEvolutions) return;

    this.cardsC.removeAll(true);
    this.cards = [];
    this.hideTip();

    const keys = Object.keys(player.possibleEvolutions);
    const count = keys.length;
    if (this.game.isMobile) this.game.events.emit('evolutionsVisible', count !== 0);

    if (count === 0) {
      if (this.container.visible) {
        this.hud.scene!.tweens.add({ targets: this.container, alpha: 0, duration: 700, onComplete: () => this.container?.setVisible(false) });
      }
      return;
    }

    if (!this.container.visible || this.container.alpha < 1) {
      this.container.setVisible(true).setAlpha(0);
      this.hud.scene!.tweens.add({ targets: this.container, alpha: 1, duration: 500 });
    }

    const discovered = getDiscoveredEvolutions();
    const scene = this.hud.scene!;
    const step = cardW + cardGap;
    const cy = cardsTop + cardH / 2;
    let i = 0;
    for (const evol of keys) {
      const evolution = Evolutions[evol];
      const cx = (i - (count - 1) / 2) * step;
      const card = scene.add.container(cx, cy);
      const panel = scene.add.graphics();
      card.add(panel);

      const skinName = this.game.gameState.self.entity!.skinName;
      const body = scene.add.sprite(0, 0, skinName + 'Body').setOrigin(0.5, 0.5);
      if (this.game.gameState.self.entity!.skin === 459) body.setScale(1.25);
      const previewScale = (player as any).bodyScale ?? 1;
      const overlay = scene.add.sprite(0, 0, evolution[1]).setOrigin(evolution[3][0], evolution[3][1]);
      overlay.setScale((body.width / previewScale) / overlay.width * evolution[2]);
      const preview = scene.add.container(0, -14, [body, overlay]);
      preview.setScale(PREVIEW / (body.height / previewScale));
      card.add(preview);

      const name = scene.add.text(0, cardH / 2 - 16, evolution[0], {
        fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5, 0.5);
      card.add(name);

      if (!discovered.has(String(evol))) {
        const badge = scene.add.text(cardW / 2 - 4, -cardH / 2 + 3, 'NEW', {
          fontFamily: font, fontSize: '13px', fontStyle: 'bold', color: '#f7d060', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(1, 0);
        card.add(badge);
        scene.tweens.add({ targets: badge, scaleX: 1.15, scaleY: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }

      const hit = scene.add.zone(0, 0, cardW, cardH).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.showTip(evol))
        .on('pointerout', () => { if (this.hoverKey === evol) this.hideTip(); })
        .on('pointerdown', () => this.selectEvolution(evol));
      card.add(hit);

      const entry = { container: card, panel, key: evol };
      this.drawCard(entry, false);
      this.cards.push(entry);
      this.cardsC.add(card);
      i += 1;
    }

    this.minimized = false;
    this.cardsC.setVisible(true);
    this.redrawBg();
  }
}

export default EvolutionSelect;
