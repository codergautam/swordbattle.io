import HudComponent from './HudComponent';
import { drawPanel } from './panel';

interface Row {
  key: string;
  container: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  visible: boolean;
  last: number;
  shownW: number;
  pulse?: Phaser.Tweens.Tween;
}

const ICON = 38;
const pad = 14;
const gap = 11;
const rowH = 54;
const rowGap = 16;

class CoinCounter extends HudComponent {
  lastUpdate = 0;
  updateInterval = 200;
  displayCoins = 0;
  rows: Row[] = [];
  private coinTween?: Phaser.Tweens.Tween;

  private makeRow(key: string, iconKey: string): Row {
    const panel = this.game.add.graphics();
    const icon = this.game.add.image(0, 0, iconKey).setOrigin(0, 0.5);
    icon.setDisplaySize(ICON, ICON);
    const text = this.game.add.text(0, 0, '0', {
      fontFamily: "'Saira', sans-serif", fontStyle: '700',
      fontSize: '34px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0, 0.5);
    const container = this.game.add.container(0, 0, [panel, icon, text]);
    return { key, container, panel, icon, text, visible: true, last: 0, shownW: -1 };
  }

  initialize() {
    this.rows = [
      this.makeRow('coins', 'coin'),
      this.makeRow('kills', 'kill'),
      this.makeRow('ultimacy', 'mastery'),
    ];
    this.container = this.game.add.container(0, 0, this.rows.map((r) => r.container));
    this.hud.add(this.container);
    this.layout();
  }

  resize() {
    if (!this.container) return;
    this.container.x = 14;
    this.container.y = 16;
  }

  private layout() {
    let y = 0;
    for (const r of this.rows) {
      r.container.setVisible(r.visible);
      if (!r.visible) continue;
      const w = pad + ICON + gap + Math.ceil(r.text.width) + pad;
      r.panel.clear();
      drawPanel(r.panel, -w / 2, -rowH / 2, w, rowH, { radius: 11 });
      r.icon.setPosition(-w / 2 + pad, 0);
      r.text.setPosition(-w / 2 + pad + ICON + gap, 0);
      r.container.setPosition(w / 2, y + rowH / 2);
      y += rowH + rowGap;
    }
  }

  private pulse(r: Row) {
    r.pulse?.stop();
    r.text.setTint(0xffe14d);
    r.pulse = this.game.tweens.addCounter({
      from: 0, to: 1, duration: 380, ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        const v = tw.getValue();
        const g = Math.round(225 + (255 - 225) * v);
        const b = Math.round(77 + (255 - 77) * v);
        r.text.setTint(Phaser.Display.Color.GetColor(255, g, b));
      },
      onComplete: () => r.text.clearTint(),
    });
  }

  private setRowText(r: Row, str: string) {
    if (r.text.text === str) return;
    r.text.setText(str);
    const w = Math.ceil(r.text.width);
    if (w !== r.shownW) { r.shownW = w; this.layout(); }
  }

  update() {
    if (!this.container) return;
    const self = this.game.gameState.self.entity;
    if (!self) return;

    const now = Date.now();
    if (this.lastUpdate + this.updateInterval > now) return;
    this.lastUpdate = now;

    const coins = self.coins || 0;
    const kills = self.kills || 0;
    const isLoggedIn = !!self.account;
    const ultimacy = coins >= 1250000
      ? Math.floor((coins / 794) ** 1.5)
      : Math.floor((coins / 5000) ** 2);

    const [coinRow, killRow, ultRow] = this.rows;

    if (coins !== coinRow.last) {
      if (coins > coinRow.last) this.pulse(coinRow);
      const from = this.displayCoins, to = coins;
      this.coinTween?.stop();
      this.coinTween = this.game.tweens.add({
        targets: { p: 0 }, p: 1, duration: 200, ease: Phaser.Math.Easing.Sine.InOut,
        onUpdate: (t, o: any) => {
          const v = Math.floor(Phaser.Math.Interpolation.Linear([from, to], o.p));
          if (v === this.displayCoins) return;
          this.displayCoins = v;
          this.setRowText(coinRow, `${v}`);
        },
      });
      coinRow.last = coins;
    } else if (this.displayCoins !== coins) {
      this.displayCoins = coins;
      this.setRowText(coinRow, `${coins}`);
    }

    if (kills !== killRow.last) {
      if (kills > killRow.last) this.pulse(killRow);
      this.setRowText(killRow, `${kills}`);
      killRow.last = kills;
    }

    if (ultimacy !== ultRow.last) {
      if (ultimacy > ultRow.last) this.pulse(ultRow);
      this.setRowText(ultRow, `${ultimacy}`);
      ultRow.last = ultimacy;
    }
    if (ultRow.visible !== isLoggedIn) {
      ultRow.visible = isLoggedIn;
      this.layout();
    }
  }
}

export default CoinCounter;
