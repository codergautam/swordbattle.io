import HudComponent from './HudComponent';
import { getTheme } from '../../hudTheme';
import { perfStats, readPeakPerfStats } from '../debug/perfStats';

const sz = 26;
const ICON = 18;
const row = 20;
const top = 24;
const good = 0xffffff, warn = 0xffd633, bad = 0xff4444;

function ensureIconTextures(scene: Phaser.Scene) {
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, sz, sz);
    g.destroy();
  };
  const w = 0xffffff, b = 0x000000, lw = 2;
  make('statPlayers', (g) => {
    g.fillStyle(w, 1); g.lineStyle(lw, b, 1);
    g.fillCircle(13, 8, 4.5); g.strokeCircle(13, 8, 4.5);
    g.fillRoundedRect(5, 15, 16, 9, 4.5); g.strokeRoundedRect(5, 15, 16, 9, 4.5);
  });
  make('statFps', (g) => {
    const pts = [[15, 2], [6, 14], [12, 14], [10, 24], [21, 9], [13, 9]];
    g.fillStyle(w, 1); g.lineStyle(lw, b, 1);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillPath(); g.strokePath();
  });
  make('statTps', (g) => {
    g.fillStyle(w, 1); g.lineStyle(lw, b, 1);
    for (const y of [4, 11, 18]) { g.fillRoundedRect(3, y, 20, 5, 2); g.strokeRoundedRect(3, y, 20, 5, 2); }
  });
  make('statPing', (g) => {
    g.fillStyle(w, 1); g.lineStyle(lw, b, 1);
    const xs = [3, 9, 15, 21], hs = [7, 12, 17, 22];
    for (let i = 0; i < 4; i++) { g.fillRoundedRect(xs[i], 24 - hs[i], 4, hs[i], 1); g.strokeRoundedRect(xs[i], 24 - hs[i], 4, hs[i], 1); }
  });
}

interface StatRow { icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; }

class Stats extends HudComponent {
  lastUpdate = 0;
  updateInterval = 1000;
  private lastFrameCount = 0;
  gear!: Phaser.GameObjects.Text;
  designerGear?: Phaser.GameObjects.Image;
  players!: StatRow;
  fps!: StatRow;
  tps!: StatRow;
  ping!: StatRow;
  private perfText?: Phaser.GameObjects.Text;

  private mkRow(iconKey: string, y: number): StatRow {
    const icon = this.game.add.image(0, y + row / 2, iconKey).setOrigin(0, 0.5).setDisplaySize(ICON, ICON);
    const text = this.game.add.text(ICON + 7, y + row / 2, '', {
      fontSize: 15, fontFamily: "'Saira', sans-serif", fontStyle: '700',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5);
    return { icon, text };
  }

  initialize() {
    if (this.game.isMobile) return;
    ensureIconTextures(this.hud.scene);

    this.gear = this.hud.scene.add.text(0, 0, '\u2699', {
      fontSize: 20, fontFamily: "'Saira', sans-serif", color: getTheme().accent, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.gear.on('pointerover', () => this.gear.setColor('#ffffff'));
    this.gear.on('pointerout', () => this.gear.setColor(getTheme().accent));
    this.gear.on('pointerdown', () => window.dispatchEvent(new CustomEvent('toggleInGameSettings')));

    if ((window as any).hudDesignerMode) {
      const tint = parseInt(getTheme().accent.slice(1), 16);
      this.designerGear = this.hud.scene.add.image(30, 2, 'wrenchIcon')
        .setOrigin(0, 0).setDisplaySize(21, 21).setTint(tint).setInteractive({ useHandCursor: true });
      this.designerGear.on('pointerover', () => this.designerGear?.setTint(0xffffff));
      this.designerGear.on('pointerout', () => this.designerGear?.setTint(parseInt(getTheme().accent.slice(1), 16)));
      this.designerGear.on('pointerdown', () => window.dispatchEvent(new CustomEvent('toggleHudDesigner')));
    }

    this.players = this.mkRow('statPlayers', top + row * 0);
    this.fps = this.mkRow('statFps', top + row * 1);
    this.tps = this.mkRow('statTps', top + row * 2);
    this.ping = this.mkRow('statPing', top + row * 3);

    this.container = this.game.add.container(0, 0, [
      this.gear,
      ...(this.designerGear ? [this.designerGear] : []),
      this.players.icon, this.players.text,
      this.fps.icon, this.fps.text,
      this.tps.icon, this.tps.text,
      this.ping.icon, this.ping.text,
    ]);
    this.hud.add(this.container);

    if (perfStats.enabled) {
      this.perfText = this.game.add.text(0, top + row * 4 + 2, '', {
        fontSize: 13, fontFamily: "'Saira', sans-serif", fontStyle: '700',
        color: '#7fd6ff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0, 0.5);
      this.container.add(this.perfText);
    }
  }

  applyTheme() {
    if (!this.gear) return;
    const t = getTheme();
    this.gear.setColor(t.accent).setStroke(t.textOutline, t.textOutlineW);
    this.designerGear?.setTint(parseInt(t.accent.slice(1), 16));
    for (const stat of [this.players, this.fps, this.tps, this.ping]) {
      stat?.text.setColor(t.text).setStroke(t.textOutline, t.textOutlineW);
    }
  }

  resize() {
    if (!this.container) return;
    const contentH = top + row * 4;
    this.container.x = 10;
    this.container.y = this.game.scale.height - contentH * this.scale - 10;
  }

  update() {
    if (!this.container) return;
    const now = Date.now();
    if (this.lastUpdate + this.updateInterval > now) return;
    const elapsed = now - this.lastUpdate || 1;
    this.lastUpdate = now;
    this.game.gameState.updatePing();

    const frames = (this.game as any).realFrameCount - this.lastFrameCount;
    this.lastFrameCount = (this.game as any).realFrameCount;
    const fps = frames > 0 ? Math.round((frames * 1000) / elapsed) : 0;
    const tps = this.game.gameState.tps;
    const ping = this.game.gameState.ping;

    this.players.text.setText(`${this.game.gameState.realPlayersCnt}`);
    this.players.icon.setTint(good);
    this.fps.text.setText(`${fps} FPS`);
    this.fps.icon.setTint(fps < 15 ? bad : fps < 30 ? warn : good);
    this.tps.text.setText(`${tps} TPS`);
    this.tps.icon.setTint(tps < 4 ? bad : tps < 8 ? warn : good);
    this.ping.text.setText(`${ping} ms`);
    this.ping.icon.setTint(ping > 1000 ? bad : ping > 350 ? warn : good);

    if (this.perfText) {
      const { draws, fbo } = readPeakPerfStats();
      this.perfText.setText(`${draws} draws · ${fbo} FBO/f`);
    }
  }
}

export default Stats;
