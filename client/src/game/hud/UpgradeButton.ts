import HudComponent from './HudComponent';

class UpgradeButton extends HudComponent {
  button: Phaser.GameObjects.Container | null = null;
  buttonBg: Phaser.GameObjects.Graphics | null = null;
  buttonText: Phaser.GameObjects.Text | null = null;
  badge: Phaser.GameObjects.Graphics | null = null;
  badgeText: Phaser.GameObjects.Text | null = null;
  hintText: Phaser.GameObjects.Text | null = null;
  hintArrow: Phaser.GameObjects.Text | null = null;
  lastCount = 0;
  hintShown = false;
  hintFading = false;

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;

    this.buttonBg = scene.add.graphics();
    this.buttonText = scene.add.text(20, 6, 'Upgrades', {
      fontSize: '16px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: '#e7e7e7',
    });

    this.badge = scene.add.graphics();
    this.badgeText = scene.add.text(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.button = scene.add.container(0, 0, [this.buttonBg, this.buttonText, this.badge, this.badgeText]);

    const hitZone = scene.add.zone(60, 15, 120, 30).setInteractive({ useHandCursor: true });
    this.button.add(hitZone);

    hitZone.on('pointerover', () => {
      const player = this.game.gameState.self.entity;
      if (player && (player as any).choosingCard) return;
      this.buttonBg?.clear();
      this.buttonBg?.fillStyle(0x1e1e1e, 1);
      this.buttonBg?.fillRoundedRect(0, 0, 120, 30, 6);
      this.buttonBg?.lineStyle(3, 0x3a3a3a, 1);
      this.buttonBg?.strokeRoundedRect(0, 0, 120, 30, 6);
    });
    hitZone.on('pointerout', () => {
      this._drawBg();
    });
    hitZone.on('pointerdown', () => {
      const player = this.game.gameState.self.entity;
      if (!player) return;
      if ((player as any).choosingCard) return;

      this.game.gameState.openCardSelect = true;
    });

    this.hintArrow = scene.add.text(0, 0, '\u2190', {
      fontSize: '28px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0, 0.5).setAlpha(0);

    this.hintText = scene.add.text(0, 0, 'Click this button to\nselect upgrades!', {
      fontSize: '14px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'left',
    }).setOrigin(0, 0.5).setAlpha(0);

    this.container = scene.add.container(10, 0, [this.button, this.hintArrow, this.hintText]);
    this.container.setDepth(50);
    this.container.setVisible(false);
  }

  _drawBg() {
    if (!this.buttonBg) return;
    this.buttonBg.clear();
    this.buttonBg.fillStyle(0x141414, 1);
    this.buttonBg.fillRoundedRect(0, 0, 120, 30, 6);
    this.buttonBg.lineStyle(3, 0x2f2f2f, 1);
    this.buttonBg.strokeRoundedRect(0, 0, 120, 30, 6);
  }

  _drawBadge(count: number) {
    if (!this.badge || !this.badgeText) return;
    this.badge.clear();
    if (count > 0) {
      this.badge.fillStyle(0xcc3333, 1);
      this.badge.fillCircle(110, 5, 12);
      this.badge.lineStyle(2, 0x2f2f2f, 1);
      this.badge.strokeCircle(110, 5, 12);
      this.badgeText.setText(String(count));
      this.badgeText.setPosition(110, 5);
    }
  }

  showHint() {
    if (this.hintShown || !this.hintArrow || !this.hintText || !this.hud.scene) return;
    this.hintShown = true;

    this.hintArrow.setPosition(130, 15);
    this.hintText.setPosition(155, 15);
    this.hintArrow.setAlpha(1);
    this.hintText.setAlpha(1);

    this.hud.scene.tweens.add({
      targets: this.hintArrow,
      x: 125,
      duration: 500,
      yoyo: true,
      repeat: 5,
    });

    this.hud.scene.time.delayedCall(5000, () => {
      this.hintFading = true;
      this.hud.scene?.tweens.add({
        targets: [this.hintArrow, this.hintText],
        alpha: 0,
        duration: 800,
      });
    });
  }

  resize() {
    this._updatePosition();
  }

  _updatePosition() {
    if (!this.container) return;
    const cc = this.hud.coinCounter;
    if (cc && cc.textObj) {
      const ccY = 40;
      const textBottom = ccY + cc.textObj.height + 50;
      this.container.setPosition(10, textBottom);
    } else {
      this.container.setPosition(10, 180);
    }
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!player || !this.container) return;

    this._updatePosition();

    const available: number = (player as any).availableUpgrades || 0;
    const choosingCard = (player as any).choosingCard;

    const shouldShow = available > 0 && !choosingCard;

    if (shouldShow) {
      this.container.setVisible(true);
      if (available !== this.lastCount) {
        this.lastCount = available;
        this._drawBg();
        this._drawBadge(available);
        if (!this.hintShown) {
          const isTutorial = (player as any).isTutorial;
          if (isTutorial) {
            this.showHint();
          } else {
            this.hintShown = true; // Skip hint for non-tutorial players
          }
        }
      }
    } else {
      this.container.setVisible(false);
      this.lastCount = 0;
    }
  }
}

export default UpgradeButton;
