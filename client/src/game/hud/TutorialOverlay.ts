import HudComponent from './HudComponent';
import { BiomeTypes } from '../Types';

class TutorialOverlay extends HudComponent {
  panel = -1;
  active = false;
  panelContainer: Phaser.GameObjects.Container | null = null;
  bgGraphics: Phaser.GameObjects.Graphics | null = null;
  headerText: Phaser.GameObjects.Text | null = null;
  bodyText: Phaser.GameObjects.Text | null = null;
  progressText: Phaser.GameObjects.Text | null = null;
  nextButton: Phaser.GameObjects.Container | null = null;
  nextButtonBg: Phaser.GameObjects.Graphics | null = null;
  nextButtonText: Phaser.GameObjects.Text | null = null;
  hasSwung = false;
  isDead = false;
  isMobile = false;
  pulseTimer = 0;
  lastCardPickNumber = 0;
  shownUpgradePanel = false;
  gameIsPlaying = false;

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;
    this.isMobile = this.game.isMobile;

    this.bgGraphics = scene.add.graphics();
    this.headerText = scene.add.text(0, 12, 'Tutorial', {
      fontSize: '18px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
      color: '#ffd700', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.bodyText = scene.add.text(0, 38, '', {
      fontSize: '13px', fontFamily: 'Ubuntu, sans-serif',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
      wordWrap: { width: 420 }, lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.progressText = scene.add.text(0, 0, '', {
      fontSize: '14px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.nextButtonBg = scene.add.graphics();
    this.nextButtonText = scene.add.text(0, 0, 'Next \u2192', {
      fontSize: '14px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const nextHit = scene.add.zone(0, 0, 120, 32).setInteractive({ useHandCursor: true });
    nextHit.on('pointerdown', () => this.advancePanel());
    nextHit.on('pointerover', () => this._drawNextButton(true));
    nextHit.on('pointerout', () => this._drawNextButton(false));
    this.nextButton = scene.add.container(0, 0, [this.nextButtonBg, this.nextButtonText, nextHit]);

    this.panelContainer = scene.add.container(0, 0, [
      this.bgGraphics, this.headerText, this.bodyText, this.progressText, this.nextButton,
    ]);

    this.container = scene.add.container(0, 0, [this.panelContainer]);
    this.container.setDepth(105);
    this.container.setVisible(false);
  }

  _drawBg(w: number, h: number) {
    if (!this.bgGraphics) return;
    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(0x000000, 0.8);
    this.bgGraphics.fillRoundedRect(-w / 2, 0, w, h, 12);
    this.bgGraphics.lineStyle(2, 0xffd700, 0.6);
    this.bgGraphics.strokeRoundedRect(-w / 2, 0, w, h, 12);
  }

  _drawNextButton(hover = false, isEnd = false) {
    if (!this.nextButtonBg) return;
    this.nextButtonBg.clear();
    const color = isEnd ? (hover ? 0x33aa33 : 0x228822) : (hover ? 0x3366bb : 0x224488);
    this.nextButtonBg.fillStyle(color, 0.9);
    this.nextButtonBg.fillRoundedRect(-60, -16, 120, 32, 8);
    const borderColor = isEnd ? 0x44ff44 : 0x4488ff;
    const pulse = 0.8 + Math.sin(this.pulseTimer * 3) * 0.2;
    this.nextButtonBg.lineStyle(2, borderColor, pulse);
    this.nextButtonBg.strokeRoundedRect(-60, -16, 120, 32, 8);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.gameIsPlaying = true;
    this.panel = 0;
    this.hasSwung = false;
    this.isDead = false;
    this.lastCardPickNumber = 0;
    this.shownUpgradePanel = false;
    if (this.container) {
      this.container.setVisible(true);
      this.container.setAlpha(1);
    }
    console.log('[Tutorial] Started, panel 0');
    this.showPanel(0);
    try { sessionStorage.setItem('swordbattle:tutorialSession', JSON.stringify({ panel: 0, active: true })); } catch (e) {}
  }

  showPanel(panelId: number) {
    this.panel = panelId;
    if (!this.bodyText || !this.progressText || !this.nextButton || !this.nextButtonText) return;

    const { width } = this.game.scale;
    const panelW = 460;
    const centerX = width / (2 * this.scale);

    const targetY = (panelId === 3) ? 180 : 10;
    if (this.panelContainer) {
      const currentY = this.panelContainer.y;
      this.panelContainer.x = centerX;
      if (currentY !== targetY && this.hud.scene) {
        this.hud.scene.tweens.add({
          targets: this.panelContainer,
          y: targetY,
          duration: 400,
          ease: 'Power2',
        });
      } else {
        this.panelContainer.y = targetY;
      }
    }

    this.progressText.setText('');
    this.nextButton.setVisible(false);

    if (this.isDead) {
      this.bodyText.setText('You were destroyed. Respawn to try again!');
      this.bodyText.setPosition(0, 38);
      this._drawBg(panelW, 75);
      return;
    }

    let body = '';
    let showNext = false;
    let isEnd = false;

    switch (panelId) {
      case 0: {
        if (this.isMobile) {
          body = 'Welcome to Swordbattle.io! This guide will show you the basics.\n\nUse the joystick to move. Tap anywhere to swing your sword. Press the Throw button for a ranged attack!\n\nTry swinging your sword now!';
        } else {
          body = 'Welcome to Swordbattle.io! This guide will show you the basics.\n\nUse WASD to move. Swing your sword with Left Click or Spacebar, and aim with your mouse. Press Right Click, C or E to throw your sword!\n\nTry swinging your sword now!';
        }
        showNext = this.hasSwung;
        break;
      }
      case 1: {
        if (!this.shownUpgradePanel) {
          body = 'You\'ve spawned in the Safezone. Move left, past the water, to reach the Grass biome!\n\nCollect coins to get stronger! Coins spawn on the ground, but you can break nearby chests or hunt down mobs for WAY more!';
        } else {
          body = 'Keep collecting coins! Remember: bigger chests drop more coins, but take longer to break. Also be careful when fighting mobs, some fight back!';
        }
        break;
      }
      case 2: {
        body = 'You\'ve unlocked your first upgrade! Select 1 of the 3 cards to improve a stat and specialize your build.\n\nEvery 5th upgrade, you\'ll get a Major upgrade that gives you unique powers!';
        this.progressText.setText('Choose an upgrade to proceed');
        break;
      }
      case 3: {
        if (this.isMobile) {
          body = 'You\'ve unlocked Evolutions! Choose one above to change your build, each has unique stats!\n\nEvolutions come with an activated ability for a powerful boost!';
        } else {
          body = 'You\'ve unlocked Evolutions! Choose one above to change your build, each has unique stats!\n\nEvolutions come with an activated ability for a powerful boost!';
        }
        showNext = true;
        break;
      }
      case 4: {
        body = 'Your shield is now fading! Other players can now duel you. Keep picking upgrades and creating a strong build!\n\nWhen fighting, make sure to time your hits and use your throw when far away, but you can always stay back if you don\'t want to fight! The choice is yours!';
        showNext = true;
        break;
      }
      case 5: {
        body = 'Tutorial complete! Collect upgrades and try new evolutions to become the strongest. Survive as long as you can!\n\nHappy Battling!';
        isEnd = true;
        break;
      }
    }

    this.bodyText.setText(body);
    this.bodyText.setPosition(0, 38);
    const textHeight = this.bodyText.height;
    let panelH = 48 + textHeight + 10;

    if (panelId === 1 || panelId === 2) {
      panelH += 22;
      this.progressText.setPosition(0, 42 + textHeight);
    }

    if (showNext || isEnd) {
      panelH += 38;
      this.nextButton.setVisible(true);
      this.nextButton.setPosition(panelW / 2 - 70, 63 + textHeight + (panelId === 1 || panelId === 2 ? 28 : 8));
      this.nextButtonText.setText(isEnd ? 'Start Playing!' : 'Next \u2192');
      this._drawNextButton(false, isEnd);
    }

    this._drawBg(panelW, panelH);
    try { sessionStorage.setItem('swordbattle:tutorialSession', JSON.stringify({ panel: panelId, active: true })); } catch (e) {}
  }

  advancePanel() {
    if (this.panel >= 5) {
      this.endTutorial();
      return;
    }

    if (this.panel === 3) {
      this.game.gameState.tutorialPanel = 4;
    }

    this.panel++;
    this.showPanel(this.panel);
  }

  endTutorial() {
    this.active = false;
    this.panel = -1;
    this.container?.setVisible(false);
    this.game.gameState.tutorialComplete = true;
    try {
      localStorage.setItem('swordbattle:tutorialComplete', 'true');
      sessionStorage.removeItem('swordbattle:tutorialSession');
    } catch (e) {}
  }

  onDeath() {
    this.isDead = true;
    if (this.active) this.showPanel(this.panel);
  }

  onRespawn() {
    this.isDead = false;
    if (this.active) {
      this.panel = 0;
      this.hasSwung = false;
      this.shownUpgradePanel = false;
      this.lastCardPickNumber = 0;
      this.showPanel(0);
    }
  }

  setShow(show: boolean, force?: boolean) {
    if (this.active) {
      if (this.container) { this.container.setAlpha(1); this.container.setVisible(true); }
      return;
    }
    super.setShow(show, force);
  }

  resize() {
    if (this.active) this.showPanel(this.panel);
  }

  update(dt: number) {
    if (!this.active && this.container) {
      const player = this.game.gameState.self.entity;
      const isReady = this.game.gameState.isReady;
      if (player && isReady && (player as any).following && (player as any).isTutorial) {
        let tutorialDone = false;
        try { tutorialDone = localStorage.getItem('swordbattle:tutorialComplete') === 'true'; } catch (e) {}
        if (!tutorialDone) {
          this.start();
        }
      }
    }

    if (!this.active || !this.container) return;
    this.pulseTimer += dt / 1000;

    const player = this.game.gameState.self.entity;
    if (!player) return;

    if (this.nextButton?.visible) {
      this._drawNextButton(false, this.panel === 5);
    }

    if (this.isDead) return;

    if (this.panel === 0) {
      if (!this.hasSwung && player.swordSwingProgress > 0) {
        this.hasSwung = true;
        this.showPanel(0);
      }
      const biome = (player as any).biome;
      if (biome !== undefined && biome !== BiomeTypes.Safezone && biome !== 0) {
        this.advancePanel();
      }
    }

    if (this.panel === 1 && this.progressText) {
      const coins = player.coins || 0;
      const remaining = Math.max(0, 1000 - coins);
      if (remaining > 0) {
        this.progressText.setText(`Collect ${remaining} more coins to proceed`);
      } else {
        this.panel = 2;
        this.showPanel(2);
      }

      const choosingCard = (player as any).choosingCard;
      if (choosingCard && !this.shownUpgradePanel) {
        this.shownUpgradePanel = true;
        this.panel = 2;
        this.showPanel(2);
      }
    }

    if (this.panel === 2) {
      const pickNum = (player as any).cardPickNumber || 0;
      if (pickNum > this.lastCardPickNumber) {
        this.lastCardPickNumber = pickNum;
        this.shownUpgradePanel = true;
        const possEvols = (player as any).possibleEvolutions;
        if (possEvols && Object.keys(possEvols).length > 0) {
          this.panel = 3;
          this.showPanel(3);
        } else {
          this.panel = 1;
          this.showPanel(1);
        }
      }
    }

    if (this.panel === 1 && this.shownUpgradePanel) {
      const possEvols = (player as any).possibleEvolutions;
      if (possEvols && Object.keys(possEvols).length > 0) {
        this.panel = 3;
        this.showPanel(3);
      }
    }

    if (this.panel === 3) {
      const evolution = player.evolution;
      if (evolution && evolution !== 0) {
        this.advancePanel();
      }
    }
  }
}

export default TutorialOverlay;
