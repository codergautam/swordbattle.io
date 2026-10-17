import HudComponent from './HudComponent';
import { Evolutions } from '../Evolutions';
import { Upgrades, UpgradeOwners } from '../Upgrades';
import { getTheme } from '../../hudTheme';
import { drawPanel } from './panel';

const selectionTiers: Array<[level: number, coins: number]> = [
  [2, 50], [12, 5000], [18, 20000], [24, 50000],
];
const footerH = 22;

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

const font = 'Saira, sans-serif';
const cardW = 96;
const cardH = 106;
const cardGap = 18;
const PREVIEW = 58;
const titleY = 18;
const cardsTop = 44;
const pad = 12;
const tipW = 250;
const selectGraceMs = 450;
const fadeOutMs = 180;
const fadeInMs = 180;

class EvolutionSelect extends HudComponent {
  private bg!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private headerHit!: any;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;
  private cardsC!: Phaser.GameObjects.Container;
  private footer!: Phaser.GameObjects.Text;
  private tipC!: Phaser.GameObjects.Container;
  private tipBg!: Phaser.GameObjects.Graphics;
  private tipName!: Phaser.GameObjects.Text;
  private tipDesc!: Phaser.GameObjects.Text;
  private tipAbil!: Phaser.GameObjects.Text;
  private tipW = 0;
  private tipH = 0;
  private hoverKey: string | null = null;
  private armedKey: string | null = null;
  private tipTimer = 0;
  minimized = false;
  updateList = false;
  private mode: 'evolutions' | 'upgrades' = 'evolutions';
  private pendingGrace = 0;
  private fadeTween: any = null;
  private cards: { container: Phaser.GameObjects.Container; panel: Phaser.GameObjects.Graphics; key: string }[] = [];
  private badgeTweens: any[] = [];
  private removesShown = false;

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;
    const t = getTheme();

    this.bg = scene.add.graphics();
    this.title = scene.add.text(0, titleY, 'Evolutions', {
      fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: t.accent, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleMinimize());

    const arrowStyle = { fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3 };
    this.leftArrow = scene.add.text(0, titleY, '▲', arrowStyle).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleMinimize());
    this.rightArrow = scene.add.text(0, titleY, '▲', arrowStyle).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleMinimize());

    this.cardsC = scene.add.container(0, 0);
    this.footer = scene.add.text(0, cardsTop + cardH + 6, '', {
      fontFamily: font, fontSize: '14px', fontStyle: 'bold', color: '#c9c9cf', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setVisible(false);
    this.headerHit = scene.add.zone(0, titleY, 260, 34).setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleMinimize());
    this.container = scene.add.container(0, 0, [this.bg, this.headerHit, this.title, this.leftArrow, this.rightArrow, this.cardsC, this.footer]);
    this.container.setDepth(50).setVisible(false);
    this.hud.add(this.container);
    this.layoutHeader();

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
    this.layoutHeader();
  }

  private layoutHeader() {
    if (!this.title || !this.leftArrow) return;
    const gap = 12;
    const hw = this.title.width / 2;
    this.leftArrow.setPosition(-hw - gap, titleY);
    this.rightArrow.setPosition(hw + gap, titleY);
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.cardsC.setVisible(!this.minimized);
    this.footer.setVisible(!this.minimized && this.cards.length > 0);
    const ch = this.minimized ? '▼' : '▲';
    this.leftArrow.setText(ch);
    this.rightArrow.setText(ch);
    if (this.minimized) this.hideTip();
    this.redrawBg();
  }

  selectEvolution(type: any) {
    const gs: any = this.game.gameState;
    if (!this.container || !this.container.visible || this.container.alpha < 0.99) return;
    if (gs.self.id === -1 || !gs.self.entity) return;
    if (this.pendingGrace > 0) return;

    markEvolutionDiscovered(String(type));
    gs.selectedEvolution = type;
    gs.self.entity.possibleEvolutions = {};
    gs.self.entity.currentUpgrades = [];
    gs.self.entity.possibleUpgrades = {};
    this.pendingGrace = selectGraceMs;
    this.updateList = true;
    this.hideTip();
  }

  selectUpgrade(id: number) {
    const gs: any = this.game.gameState;
    if (!this.container || !this.container.visible || this.container.alpha < 0.99) return;
    if (gs.self.id === -1 || !gs.self.entity) return;
    if (this.pendingGrace > 0) return;

    gs.selectedUpgrade = id;
    gs.self.entity.possibleUpgrades = {};
    gs.self.entity.possibleEvolutions = {};
    this.mode = 'evolutions';
    this.pendingGrace = selectGraceMs;
    this.updateList = true;
    this.hideTip();
  }

  private toggleToUpgrades() {
    if (this.pendingGrace > 0) return;
    this.mode = 'upgrades';
    this.game.gameState.openUpgradeSelect = true;
    this.updateList = true;
    this.hideTip();
  }

  private toggleToEvolutions() {
    this.mode = 'evolutions';
    this.game.gameState.closeUpgradeSelect = true;
    this.updateList = true;
    this.hideTip();
  }

  private killFade() {
    if (this.fadeTween) { try { this.fadeTween.stop(); } catch (e) {} this.fadeTween = null; }
  }

  private hidePanelNow() {
    this.killFade();
    this.hideTip();
    this.mode = 'evolutions';
    if (this.container) { this.container.setVisible(false); this.container.setAlpha(1); }
  }

  private hideTip() {
    this.hoverKey = null;
    this.armedKey = null;
    this.tipTimer = 0;
    this.tipC?.setVisible(false).setScale(1);
    for (const c of this.cards) this.drawCard(c, false);
  }

  private showTip(key: string, mobile = false) {
    let name = '', desc = '', abil: string | null = null, abilColor = '#ffcf33';
    if (key === '__wrench') {
      name = 'Upgrade';
      desc = 'Choose an upgrade for your current evolution and skip this evolution selection.';
      const gs: any = this.game.gameState;
      const evoId = gs?.self?.entity?.evolution ?? 0;
      const evoName = evoId === 0 ? 'Classless' : (Evolutions[evoId]?.[0] || 'your evolution');
      abil = '(' + evoName + ')';
      abilColor = '#33e0ff';
    } else if (key === '__close') {
      name = 'Close';
      desc = 'Go back to the evolution choices.';
    } else if (key.startsWith('u:')) {
      const u = Upgrades[Number(key.slice(2))];
      if (!u) return;
      name = u[0]; desc = u[1];
    } else {
      const e = Evolutions[key];
      if (!e) return;
      name = e[0]; desc = e[4]; abil = 'Ability: ' + e[5];
    }
    this.hoverKey = key;
    const padx = 12, pady = 9, gap = 4;
    this.tipName.setText(name).setPosition(padx, pady);
    this.tipDesc.setText(desc).setPosition(padx, pady + this.tipName.height + gap);
    if (abil) {
      this.tipAbil.setVisible(true).setColor(abilColor).setText(abil).setPosition(padx, this.tipDesc.y + this.tipDesc.height + gap);
    } else {
      this.tipAbil.setVisible(false).setText('');
    }
    const contentBottom = abil ? this.tipAbil.y + this.tipAbil.height : this.tipDesc.y + this.tipDesc.height;
    const w = Math.min(tipW, Math.max(this.tipName.width, this.tipDesc.width, abil ? this.tipAbil.width : 0) + padx * 2);
    const h = contentBottom + pady;
    this.tipBg.clear();
    this.tipBg.fillStyle(0x0b0b0d, 0.94);
    this.tipBg.fillRoundedRect(0, 0, w, h, 7);
    this.tipBg.lineStyle(1.5, 0x000000, 0.9);
    this.tipBg.strokeRoundedRect(0, 0, w, h, 7);
    this.tipW = w; this.tipH = h;
    if (mobile) {
      const s = 1.5;
      this.tipC.setScale(s);
      const panelBottom = (cardsTop + cardH + pad + footerH + 22) * this.scale;
      this.tipC.setPosition(this.game.scale.width / 2 - (w * s) / 2, panelBottom);
    } else {
      this.tipC.setScale(1);
    }
    this.tipC.setVisible(true);
    for (const c of this.cards) this.drawCard(c, c.key === key);
  }

  private drawCard(card: { panel: Phaser.GameObjects.Graphics; key: string }, hot: boolean) {
    const g = card.panel;
    const t = getTheme();
    g.clear();
    drawPanel(g, -cardW / 2, -cardH / 2, cardW, cardH, { radius: t.radius });
    if (hot) {
      g.fillStyle(t.border, 0.16);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
      g.lineStyle(3, 0xffffff, 0.95);
      g.strokeRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH - 4, 8);
    }
  }

  private redrawBg() {
    const t = getTheme();
    const count = this.cards.length;
    const rowW = count > 0 ? count * cardW + (count - 1) * cardGap : 240;
    const w = rowW + pad * 2;
    const bottom = this.minimized ? cardsTop - 8 : cardsTop + cardH + pad + footerH;
    this.bg.clear();
    drawPanel(this.bg, -w / 2, -24, w, bottom + 24, { radius: t.radius * 1.4 });
  }

  applyTheme() {
    if (!this.bg) return;
    const t = getTheme();
    this.title?.setColor(t.accent).setStroke(t.textOutline, t.textOutlineW);
    this.footer?.setStroke(t.textOutline, t.textOutlineW);
    this.redrawBg();
    for (const card of this.cards) this.drawCard(card, card.key === this.hoverKey);
  }

  update(dt = 16) {
    const gs: any = this.game.gameState;
    const player = gs.self.entity;
    if (!this.container) return;

    if (this.pendingGrace > 0) this.pendingGrace = Math.max(0, this.pendingGrace - dt);

    if (!player || gs.self.id === -1) {
      this.pendingGrace = 0;
      if (this.container.visible) this.hidePanelNow();
      (this.cardsC as any).interactiveChildren = false;
      return;
    }
    (this.cardsC as any).interactiveChildren = true;

    if (player.coins === 0) {
      if (this.container.visible) this.hidePanelNow();
      this.minimized = false;
      return;
    }

    if (this.hoverKey && this.tipC.visible && !this.game.isMobile) {
      const p = this.hud.scene!.input.activePointer;
      const sw = this.game.scale.width, sh = this.game.scale.height;
      let tx = p.x + 16, ty = p.y + 16;
      if (tx + this.tipW > sw - 4) tx = p.x - this.tipW - 16;
      if (ty + this.tipH > sh - 4) ty = sh - this.tipH - 6;
      this.tipC.setPosition(tx, ty);
    }
    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) this.hideTip();
    }

    if (!this.updateList) return;
    this.updateList = false;

    const evoMap = player.possibleEvolutions || {};
    const upMap = player.possibleUpgrades || {};
    const evoKeys = Object.keys(evoMap);
    const upKeys = Object.keys(upMap).filter(u => UpgradeOwners[Number(u)] === player.evolution);
    const curUpgrades: number[] = player.currentUpgrades || [];
    const hasUpgradesOffered = upKeys.length > 0;

    if (this.mode === 'upgrades' && !hasUpgradesOffered) this.mode = 'evolutions';

    if (this.pendingGrace > 0 && this.mode === 'evolutions' && evoKeys.length === 0) {
      this.updateList = true;
      return;
    }

    type Tile = { kind: 'evo' | 'upgrade' | 'wrench' | 'close'; key: string; id: string };
    const layout: Tile[] = [];
    if (this.mode === 'upgrades') {
      for (const u of upKeys) layout.push({ kind: 'upgrade', key: 'u:' + u, id: u });
      layout.push({ kind: 'close', key: '__close', id: '' });
    } else if (evoKeys.length > 0) {
      for (const e of evoKeys) layout.push({ kind: 'evo', key: e, id: e });
      if (hasUpgradesOffered) layout.push({ kind: 'wrench', key: '__wrench', id: '' });
    } else if (hasUpgradesOffered) {
      layout.push({ kind: 'wrench', key: '__wrench', id: '' });
    }

    const keys = layout.map(t => t.key);
    const count = layout.length;
    const removesUpgrades = curUpgrades.length > 0;

    const sameList = count > 0 && count === this.cards.length
      && removesUpgrades === this.removesShown
      && keys.every((k, i) => this.cards[i] && this.cards[i].key === k);
    if (sameList && this.container.visible && this.container.alpha >= 1) {
      this.pendingGrace = 0;
      return;
    }

    for (const t of this.badgeTweens) { try { t.stop(); } catch (e) {} }
    this.badgeTweens = [];
    this.cardsC.removeAll(true);
    this.cards = [];
    this.removesShown = removesUpgrades;
    this.hideTip();

    this.title.setText(this.mode === 'upgrades' ? 'Upgrades' : 'Evolutions');

    if (this.game.isMobile) this.game.events.emit('evolutionsVisible', count !== 0);

    if (count === 0) {
      if (this.pendingGrace > 0) { this.updateList = true; return; }
      if (this.container.visible) {
        this.killFade();
        this.fadeTween = this.hud.scene!.tweens.add({
          targets: this.container, alpha: 0, duration: fadeOutMs,
          onComplete: () => { this.fadeTween = null; this.container?.setVisible(false); },
        });
      }
      return;
    }

    this.pendingGrace = 0;
    if (!this.container.visible || this.container.alpha < 1) {
      this.killFade();
      this.container.setVisible(true).setAlpha(0);
      this.fadeTween = this.hud.scene!.tweens.add({
        targets: this.container, alpha: 1, duration: fadeInMs,
        onComplete: () => { this.fadeTween = null; },
      });
    }

    const discovered = getDiscoveredEvolutions();
    const scene = this.hud.scene!;
    const step = cardW + cardGap;
    const cy = cardsTop + cardH / 2;
    for (let i = 0; i < layout.length; i++) {
      const tile = layout[i];
      const cx = (i - (count - 1) / 2) * step;
      let card: Phaser.GameObjects.Container;
      if (tile.kind === 'evo') card = this.buildEvolutionCard(scene, tile.id, cx, cy, discovered, removesUpgrades);
      else if (tile.kind === 'upgrade') card = this.buildUpgradeCard(scene, tile.id, cx, cy);
      else if (tile.kind === 'wrench') card = this.buildWrenchTile(scene, cx, cy);
      else card = this.buildCloseTile(scene, cx, cy);
      this.cardsC.add(card);
    }

    if (this.mode === 'evolutions') {
      const offerLevel = this.game.gameState?.self?.entity?.activeSelection || 0;
      if (offerLevel > 0) {
        const evo = this.game.gameState?.self?.entity?.evolution ?? 0;
        const playerLevel = this.game.gameState?.self?.entity?.level ?? 0;
        const terminal = [14, 15, 17, 35, 36, 37];
        const isTerminal = terminal.includes(evo) || (evo === 13 && playerLevel >= 18);
        const next = isTerminal ? undefined : selectionTiers.find(([lvl]) => lvl > offerLevel);
        this.footer.setText(next ? `Next selection at ${next[1].toLocaleString()} coins` : 'Last selection');
      }
      this.footer.setVisible(!this.minimized && offerLevel > 0);
    } else {
      this.footer.setVisible(false);
    }

    this.cardsC.setVisible(!this.minimized);
    this.layoutHeader();
    this.redrawBg();
  }

  private buildEvolutionCard(
    scene: Phaser.Scene, evol: string, cx: number, cy: number,
    discovered: Set<string>, removesUpgrades: boolean,
  ): Phaser.GameObjects.Container {
    const player = this.game.gameState.self.entity!;
    const evolution = Evolutions[evol];
    const card = scene.add.container(cx, cy);
    const panel = scene.add.graphics();
    card.add(panel);

    const usingSkin = scene.textures.exists(player.skinName + 'Body');
    const skinKey = usingSkin ? player.skinName + 'Body' : 'playerBody';
    const body = scene.add.sprite(0, 0, skinKey).setOrigin(0.5, 0.5);
    if (usingSkin && player.skin === 459) body.setScale(1.25);
    const previewScale = usingSkin ? ((player as any).bodyScale ?? 1) : 1;
    const overlay = scene.add.sprite(0, 0, evolution[1]).setOrigin(evolution[3][0], evolution[3][1]);
    const bw = body.width || 1;
    const bh = body.height || 1;
    overlay.setScale((bw / previewScale) / (overlay.width || 1) * evolution[2]);
    const preview = scene.add.container(0, -14, [body, overlay]);
    preview.setScale(PREVIEW / (bh / previewScale));
    card.add(preview);

    const nameY = removesUpgrades ? cardH / 2 - 27 : cardH / 2 - 16;
    const name = scene.add.text(0, nameY, evolution[0], {
      fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: cardW - 8 },
    }).setOrigin(0.5, 0.5);
    card.add(name);

    const note = scene.add.text(0, cardH / 2 - 13, 'Resets upgrades', {
      fontFamily: font, fontSize: '10px', fontStyle: 'bold', color: '#ff5555', stroke: '#000000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5, 0.5).setVisible(removesUpgrades);
    card.add(note);

    if (!discovered.has(String(evol))) {
      const badge = scene.add.text(cardW / 2 - 4, -cardH / 2 + 3, 'NEW', {
        fontFamily: font, fontSize: '13px', fontStyle: 'bold', color: '#f7d060', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(1, 0);
      card.add(badge);
      this.badgeTweens.push(scene.tweens.add({ targets: badge, scaleX: 1.15, scaleY: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    }

    const hit = scene.add.zone(0, 0, cardW, cardH).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.game.isMobile) this.showTip(evol); })
      .on('pointerout', () => { if (!this.game.isMobile && this.hoverKey === evol) this.hideTip(); })
      .on('pointerdown', () => {
        if (this.game.isMobile) {
          if (this.armedKey === evol) this.selectEvolution(evol);
          else { this.armedKey = evol; this.showTip(evol, true); this.tipTimer = 10000; }
        } else {
          this.selectEvolution(evol);
        }
      });
    card.add(hit);

    const entry = { container: card, panel, key: evol };
    this.drawCard(entry, false);
    this.cards.push(entry);
    return card;
  }

  private buildUpgradeCard(scene: Phaser.Scene, upId: string, cx: number, cy: number): Phaser.GameObjects.Container {
    const key = 'u:' + upId;
    const up = Upgrades[Number(upId)];
    const card = scene.add.container(cx, cy);
    const panel = scene.add.graphics();
    card.add(panel);

    const icon = scene.textures.exists('wrenchIcon')
      ? scene.add.image(0, -14, 'wrenchIcon').setDisplaySize(52, 52).setOrigin(0.5, 0.5)
      : scene.add.text(0, -14, up ? up[2] : '\u{1F527}', { fontFamily: font, fontSize: '40px', align: 'center' }).setOrigin(0.5, 0.5);
    card.add(icon);

    const name = scene.add.text(0, cardH / 2 - 16, up ? up[0] : ('#' + upId), {
      fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: cardW - 8 },
    }).setOrigin(0.5, 0.5);
    card.add(name);

    const hit = scene.add.zone(0, 0, cardW, cardH).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.game.isMobile) this.showTip(key); })
      .on('pointerout', () => { if (!this.game.isMobile && this.hoverKey === key) this.hideTip(); })
      .on('pointerdown', () => {
        if (this.game.isMobile) {
          if (this.armedKey === key) this.selectUpgrade(Number(upId));
          else { this.armedKey = key; this.showTip(key, true); this.tipTimer = 10000; }
        } else {
          this.selectUpgrade(Number(upId));
        }
      });
    card.add(hit);

    const entry = { container: card, panel, key };
    this.drawCard(entry, false);
    this.cards.push(entry);
    return card;
  }

  private buildWrenchTile(scene: Phaser.Scene, cx: number, cy: number): Phaser.GameObjects.Container {
    const key = '__wrench';
    const card = scene.add.container(cx, cy);
    const panel = scene.add.graphics();
    card.add(panel);

    const icon = scene.textures.exists('wrenchIcon')
      ? scene.add.image(0, -14, 'wrenchIcon').setDisplaySize(56, 56).setOrigin(0.5, 0.5)
      : scene.add.text(0, -14, '\u{1F527}', { fontFamily: font, fontSize: '40px', align: 'center' }).setOrigin(0.5, 0.5);
    card.add(icon);
    const name = scene.add.text(0, cardH / 2 - 16, 'Upgrade', {
      fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: cardW - 8 },
    }).setOrigin(0.5, 0.5);
    card.add(name);

    const hit = scene.add.zone(0, 0, cardW, cardH).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.game.isMobile) this.showTip(key); })
      .on('pointerout', () => { if (!this.game.isMobile && this.hoverKey === key) this.hideTip(); })
      .on('pointerdown', () => this.toggleToUpgrades());
    card.add(hit);

    const entry = { container: card, panel, key };
    this.drawCard(entry, false);
    this.cards.push(entry);
    return card;
  }

  private buildCloseTile(scene: Phaser.Scene, cx: number, cy: number): Phaser.GameObjects.Container {
    const key = '__close';
    const card = scene.add.container(cx, cy);
    const panel = scene.add.graphics();
    card.add(panel);

    const icon = scene.textures.exists('closeIcon')
      ? scene.add.image(0, -14, 'closeIcon').setDisplaySize(54, 54).setOrigin(0.5, 0.5)
      : scene.add.text(0, -14, '✕', {
          fontFamily: font, fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center',
        }).setOrigin(0.5, 0.5);
    card.add(icon);
    const name = scene.add.text(0, cardH / 2 - 16, 'Close', {
      fontFamily: font, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: cardW - 8 },
    }).setOrigin(0.5, 0.5);
    card.add(name);

    const hit = scene.add.zone(0, 0, cardW, cardH).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!this.game.isMobile) this.showTip(key); })
      .on('pointerout', () => { if (!this.game.isMobile && this.hoverKey === key) this.hideTip(); })
      .on('pointerdown', () => this.toggleToEvolutions());
    card.add(hit);

    const entry = { container: card, panel, key };
    this.drawCard(entry, false);
    this.cards.push(entry);
    return card;
  }
}

export default EvolutionSelect;
