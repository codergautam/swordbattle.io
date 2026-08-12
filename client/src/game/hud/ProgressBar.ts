import HudComponent from './HudComponent';
import { BiomeTypes, EntityTypes, FlagTypes } from '../Types';
import { drawPanel } from './panel';
import { getTheme } from '../../hudTheme';

class ProgressBar extends HudComponent {
  panelG!: Phaser.GameObjects.Graphics;
  fillG!: Phaser.GameObjects.Graphics;
  progressBarContainer!: Phaser.GameObjects.Container;
  levelText!: Phaser.GameObjects.Text;
  levelTextTween!: Phaser.Tweens.Tween;
  levelUpText!: Phaser.GameObjects.Text;
  stabbedText!: Phaser.GameObjects.Text;
  burningText!: Phaser.GameObjects.Text;
  inSafezoneMessage!: Phaser.GameObjects.Text;
  width = 540;
  height = 34;

  // Variables for smooth interpolation and level change tracking
  currentProgress: number = 0;
  targetProgress: number = 0;
  lastKnownLevel: number | null = null;
  levelUpStreak = 0;

  killStreak = 0;
  lastKillTime = 0;
  lastEntityStabId = 0;
  currentProtectionMessage: 'none' | 'safezone' | 'respawnShield' | 'respawnShieldFading' | 'captureZone' | 'tutorial' | 'contested' = 'none';
  isBurning = false;
  isHypnotized = false;


  initialize() {
    this.panelG = this.game.add.graphics();
    const t = getTheme();
    drawPanel(this.panelG, 0, 0, this.width, this.height, {
      radius: t.progressBarRadius,
      bg: t.progressBarBg,
      bgAlpha: t.progressBarBackgroundEnabled ? t.progressBarBgAlpha : 0,
    });

    this.fillG = this.game.add.graphics();

    this.levelText = this.game.add.text(this.width / 2, this.height / 2, '', {
      fontSize: 19,
      fontFamily: "'Saira', sans-serif",
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.inSafezoneMessage = this.game.add.text(this.width / 2, -22, 'You are protected: you are in the safezone', {
      fontSize: 22,
      fontFamily: "'Saira', sans-serif",
      fontStyle: '700',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.levelUpText = this.game.add.text(this.width / 2, -this.game.scale.height / 5, '', {
      fontSize: 50,
      fontFamily: "'Saira', sans-serif",
      fontStyle: '700',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.stabbedText = this.game.add.text(this.width / 2, this.game.scale.height, '', {
      fontSize: 50,
      fontFamily: "'Saira', sans-serif",
      fontStyle: '700',
      color: '#f23838',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.burningText = this.game.add.text(this.width / 2, -56, 'Burning!', {
      fontSize: 24,
      fontFamily: "'Saira', sans-serif",
      fontStyle: '700',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    this.progressBarContainer = this.hud.scene.add.container(0, 0, [this.panelG, this.fillG, this.levelText, this.inSafezoneMessage, this.burningText]);
    this.container = this.game.add.container(0, 0, [this.progressBarContainer, this.levelUpText, this.stabbedText]);
    this.hud.add(this.container);
  }

  applyTheme() {
    if (!this.panelG) return;
    const t = getTheme();
    this.panelG.clear();
    drawPanel(this.panelG, 0, 0, this.width, this.height, {
      radius: t.progressBarRadius,
      bg: t.progressBarBg,
      bgAlpha: t.progressBarBackgroundEnabled ? t.progressBarBgAlpha : 0,
    });
    this.levelText?.setColor(t.text).setStroke(t.textOutline, t.textOutlineW);
  }

  private lastFillPx = -1;
  private lastPct = -1;
  private lastLevelText = -1;
  private lastLevelTextAt = 0;
  private drawFill(progress: number) {
    const t = getTheme();
    const inset = 5;
    const trackW = this.width - inset * 2;
    const h = this.height - inset * 2;
    const fw = Math.max(0, Math.min(trackW, trackW * progress));
    const px = Math.round(fw);
    if (px === this.lastFillPx) return;
    this.lastFillPx = px;
    this.fillG.clear();
    if (fw <= 0) return;
    const r = t.progressBarRadius;
    this.fillG.fillStyle(t.progressBarFill, 1);
    this.fillG.fillRoundedRect(inset, inset, fw, h, r);
    if (t.progressBarShineEnabled) {
      const hh = h * 0.45;
      this.fillG.fillStyle(t.progressBarShine, t.progressBarShineAlpha);
      this.fillG.fillRoundedRect(inset + 1, inset + 1, Math.max(0, fw - 2), hh, r);
    }
  }

  // Adjust the progress bar's position on window resize
  resize() {
    if (!this.progressBarContainer) return;
    this.container.x = (this.game.scale.width - this.width * this.scale) / 2;
    this.progressBarContainer.y = this.game.scale.height / this.scale - (this.height + 10);
  }

  showStabbedText(nickname: string) {
    if (Date.now() - this.lastKillTime < 2500) {
      this.stabbedText.setColor('white');
      let killStreakText = "Kill!";
      const killStreakList = ["Double", "Triple", "Quadra", "Quinta", "Hexta", "Hepta", "Octa", "Nona", "Deca"];
      if (this.killStreak - 1 < killStreakList.length) {
        killStreakText = `${killStreakList[this.killStreak - 1]} ${killStreakText}`;
      } else {
        killStreakText = `x${this.killStreak} ${killStreakText}`;
      }
      this.stabbedText.setText(killStreakText);
    } else {
      this.stabbedText.setColor('#f23838');
      this.killStreak = 0;
      this.stabbedText.setText(`Killed ${nickname}`);
    }

    const onComplete = () => {
      this.game.tweens.add({
        targets: this.stabbedText,
        alpha: 0,
        y: this.game.scale.height / this.scale,
        duration: 250,
        ease: 'Power2',
      });
    }

    this.game.tweens.add({
      targets: this.stabbedText,
      alpha: 1,
      y: this.game.scale.height / this.scale - (this.height + 10) - 100,
      duration: 500,
      ease: 'Bounce',
      completeDelay: 1000,
      onComplete,
    });
  }

  toggleSafezoneText(show: boolean) {
    this.game.tweens.add({
      targets: [this.inSafezoneMessage],
      alpha: show ? 1 : 0,
      duration: 100,
    });
  }

  updateLevelUpText(difference: number) {
    this.levelUpStreak += difference;
    this.levelUpText.setText(`Level up!${this.levelUpStreak > 1 ? ' x' + this.levelUpStreak : ''}`);

    if (this.levelTextTween) this.levelTextTween.stop();

    const onComplete = () => {
      this.levelTextTween = this.hud.scene.add.tween({
        targets: this.levelUpText,
        alpha: 0,
        y: 0,
        onComplete: () => this.levelUpStreak = 0,
        ease: 'Power2',
      });
    };

    this.levelTextTween = this.hud.scene.add.tween({
      targets: this.levelUpText,
      y: (this.game.scale.height / this.scale) * 0.15,
      alpha: 1,
      completeDelay: 1000,
      duration: 500,
      onComplete,
      ease: 'Power2',
    });
  }

  updateBurningText(isBurning: boolean, hasProtectionMessage: boolean, isHypnotized: boolean) {
    if (isHypnotized && !this.isHypnotized) {
      this.isHypnotized = true;
      this.burningText.setText('Hypnotized!');
      this.burningText.setColor('#9b30ff');
      this.burningText.setStroke('#000000', 5);

      this.game.tweens.killTweensOf(this.burningText);
      const targetY = hasProtectionMessage ? -this.height - 110 : -this.height - 90;
      this.game.tweens.add({
        targets: this.burningText,
        alpha: 1,
        y: targetY,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        ease: 'Back.easeOut',
        yoyo: true,
        repeat: -1,
        repeatDelay: 300,
      });
      this.isBurning = true;
    } else if (!isHypnotized && this.isHypnotized) {
      this.isHypnotized = false;
      this.burningText.setText('Burning!');
      this.burningText.setColor('#ff4444');
      this.burningText.setStroke('#000000', 5);

      if (isBurning) {
        this.game.tweens.killTweensOf(this.burningText);
        const targetY = hasProtectionMessage ? -this.height - 110 : -this.height - 90;
        this.game.tweens.add({
          targets: this.burningText,
          alpha: 1,
          y: targetY,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          ease: 'Back.easeOut',
          yoyo: true,
          repeat: -1,
          repeatDelay: 300,
        });
        this.isBurning = true;
      } else {
        this.isBurning = false;
        this.game.tweens.killTweensOf(this.burningText);
        this.game.tweens.add({
          targets: this.burningText,
          alpha: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Power2',
        });
      }
    } else if (!isHypnotized) {
      if (isBurning && !this.isBurning) {
        this.isBurning = true;
        const targetY = hasProtectionMessage ? -this.height - 110 : -this.height - 90;
        this.game.tweens.add({
          targets: this.burningText,
          alpha: 1,
          y: targetY,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          ease: 'Back.easeOut',
          yoyo: true,
          repeat: -1,
          repeatDelay: 300,
        });
      } else if (!isBurning && this.isBurning) {
        this.isBurning = false;
        this.game.tweens.killTweensOf(this.burningText);
        this.game.tweens.add({
          targets: this.burningText,
          alpha: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Power2',
        });
      } else if (isBurning && this.isBurning) {
        const targetY = hasProtectionMessage ? -this.height - 110 : -this.height - 90;
        if (Math.abs(this.burningText.y - targetY) > 5) {
          this.game.tweens.add({
            targets: this.burningText,
            y: targetY,
            duration: 200,
            ease: 'Power2',
          });
        }
      }
    }
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!this.container || !player) return;

    // Calculate the raw progress
    this.targetProgress = Math.min((player.coins - player.previousLevelCoins) / (player.nextLevelCoins - player.previousLevelCoins), 1);

    // Check for a level-up event
    if (this.lastKnownLevel !== null && player.level > this.lastKnownLevel) {
      this.updateLevelUpText(player.level - this.lastKnownLevel);
    }
    this.lastKnownLevel = player.level;

    this.currentProgress += (this.targetProgress - this.currentProgress) * 0.1;
    if (Math.abs(this.targetProgress - this.currentProgress) < 0.0005) {
      this.currentProgress = this.targetProgress;
    }
    const pct = Math.round(this.currentProgress * 100);
    const levelChanged = player.level !== this.lastLevelText;
    const nowMs = Date.now();
    if (levelChanged || (pct !== this.lastPct && nowMs - this.lastLevelTextAt >= 100)) {
      this.levelText!.text = `Level ${player.level} (${pct}%)`;
      this.lastPct = pct;
      this.lastLevelText = player.level;
      this.lastLevelTextAt = nowMs;
    }
    this.drawFill(this.currentProgress);

    let inCaptureZone = false;
    if (player.shape) {
      const globalEntities = this.game.gameState.globalEntities;
      for (const id in globalEntities) {
        const ge = globalEntities[id];
        if (ge.type === EntityTypes.CaptureZone && ge.shape) {
          const dx = player.shape.x - ge.shape.x;
          const dy = player.shape.y - ge.shape.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ge.shape.radius) {
            inCaptureZone = true;
            break;
          }
        }
      }
    }

    let desiredProtectionState: 'none' | 'safezone' | 'respawnShield' | 'respawnShieldFading' | 'captureZone' | 'tutorial' | 'contested' = 'none';
    if (player.flags[FlagTypes.ContestedObject]) {
      desiredProtectionState = 'contested';
    } else if ((player as any).isTutorial) {
      desiredProtectionState = 'tutorial';
    } else if (player.flags[FlagTypes.RespawnShield] === 2) {
      desiredProtectionState = 'respawnShieldFading';
    } else if (player.flags[FlagTypes.RespawnShield]) {
      desiredProtectionState = 'respawnShield';
    } else if (player.biome === BiomeTypes.Safezone) {
      desiredProtectionState = 'safezone';
    } else if (inCaptureZone) {
      desiredProtectionState = 'captureZone';
    }

    const switchProtectionMessage = () => {
      const isMobile = this.game.isMobile;

      if (desiredProtectionState === 'contested') {
        this.inSafezoneMessage.setColor('#ff9a3c');
        this.inSafezoneMessage.setText('Only one person can break this at a time!');
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 1,
          duration: 200,
        });
      } else if (desiredProtectionState === 'tutorial') {
        this.inSafezoneMessage.setColor('#44ff88');
        this.inSafezoneMessage.setText('You are protected: currently in tutorial');
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 1,
          duration: 200,
        });
      } else if (desiredProtectionState === 'respawnShield' && !isMobile) {
        this.inSafezoneMessage.setColor('#ffffff');
        this.inSafezoneMessage.setText('You are protected: temporarily shielded on respawn');
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 1,
          duration: 200,
        });
      } else if (desiredProtectionState === 'respawnShieldFading' && !isMobile) {
        this.inSafezoneMessage.setColor('#aaaaaa');
        this.inSafezoneMessage.setText('Protection fading...');
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 0.7,
          duration: 200,
        });
      } else if (desiredProtectionState === 'safezone') {
        this.inSafezoneMessage.setColor('#ffffff');
        this.inSafezoneMessage.setText(isMobile ? 'You are in the safezone' : 'You are protected: you are in the safezone');
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 1,
          duration: 200,
        });
      } else if (desiredProtectionState === 'captureZone' && !isMobile) {
        this.inSafezoneMessage.setColor('#ffd700');
        this.inSafezoneMessage.setText('You are capturing coins: taking slight damage over time');
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 1,
          duration: 200,
        });
      } else {
        this.inSafezoneMessage.setColor('#ffffff');
        this.game.tweens.add({
          targets: [this.inSafezoneMessage],
          alpha: 0,
          duration: 200,
        });
      }
      this.currentProtectionMessage = desiredProtectionState;
    };

    if (desiredProtectionState !== this.currentProtectionMessage) {
      if (this.currentProtectionMessage === 'none') {
        switchProtectionMessage();
      } else {
        this.game.tweens.add({
          targets: [this.inSafezoneMessage],
          alpha: 0,
          duration: 200,
          onComplete: switchProtectionMessage,
        });
      }
    }

    const isCurrentlyBurning = !!player.flags[FlagTypes.LavaDamaged];
    const isCurrentlyHypnotized = !!player.flags[FlagTypes.Hypnotized];
    const hasProtectionMessage = desiredProtectionState !== 'none';
    this.updateBurningText(isCurrentlyBurning, hasProtectionMessage, isCurrentlyHypnotized);

    const stabbedId = player.flags[FlagTypes.PlayerKill];
    if(!stabbedId) return;
    const stabbedEntity = this.game.gameState.recentDeadPlayers[stabbedId] || this.game.gameState.entities[stabbedId];
    if (stabbedEntity && stabbedId !== this.lastEntityStabId) {
      this.showStabbedText(stabbedEntity.name);
      this.lastKillTime = Date.now();
      this.killStreak++;
      this.lastEntityStabId = stabbedId;
    }
  }
}

export default ProgressBar;
