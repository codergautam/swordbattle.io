import HudComponent from './HudComponent';
import { BiomeTypes, EntityTypes, FlagTypes } from '../Types';

class ProgressBar extends HudComponent {
  barBackground: any;
  progressBar!: Phaser.GameObjects.Graphics;
  progressBarContainer!: Phaser.GameObjects.Container;
  levelText!: Phaser.GameObjects.Text;
  levelTextTween!: Phaser.Tweens.Tween;
  levelUpText!: Phaser.GameObjects.Text;
  stabbedText!: Phaser.GameObjects.Text;
  burningText!: Phaser.GameObjects.Text;
  inSafezoneMessage!: Phaser.GameObjects.Text;
  width = 500;
  height = 15;

  // Variables for smooth interpolation and level change tracking
  currentProgress: number = 0;
  targetProgress: number = 0;
  lastKnownLevel: number | null = null;
  levelUpStreak = 0;

  killStreak = 0;
  lastKillTime = 0;
  lastEntityStabId = 0;
  currentProtectionMessage: 'none' | 'safezone' | 'collect' | 'respawnShield' | 'respawnShieldFading' | 'captureZone' | 'tutorial' = 'none';
  isBurning = false;
  isHypnotized = false;


  initialize() {
    // Create the background bar
    this.barBackground = this.game.add.graphics();
    this.barBackground.lineStyle(6, 0x000000);
    this.barBackground.strokeRect(0, 0, this.width, this.height);
    this.barBackground.fillStyle(0xffffff);
    this.barBackground.fillRect(0, 0, this.width, this.height);

    // Create the progress bar itself
    this.progressBar = this.game.add.graphics();
    this.progressBar.fillStyle(0x00FFFF);
    this.progressBar.fillRect(0, 0, this.width, this.height);

    // Add level text, centering it above the progress bar
    this.levelText = this.game.add.text(this.width / 2, -this.height - 10, '', {
      fontSize: 30,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // "You are in the safe zone" text
    this.inSafezoneMessage = this.game.add.text(this.width / 2, -this.height - 45, 'You are protected: you are in the safezone', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.levelUpText = this.game.add.text(this.width / 2, -this.game.scale.height / 5, '', {
      fontSize: 50,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.stabbedText = this.game.add.text(this.width / 2, this.game.scale.height, '', {
      fontSize: 50,
      fontStyle: 'bold',
      color: '#f23838',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.burningText = this.game.add.text(this.width / 2, -this.height - 90, 'Burning!', {
      fontSize: 24,
      fontStyle: 'bold',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    this.progressBarContainer = this.hud.scene.add.container(0, 0, [this.barBackground, this.progressBar, this.levelText, this.inSafezoneMessage, this.burningText]);
    this.container = this.game.add.container(0, 0, [this.progressBarContainer, this.levelUpText, this.stabbedText]);
    this.hud.add(this.container);
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

    // Interpolation for smoother progress bar movement
    this.currentProgress += (this.targetProgress - this.currentProgress) * 0.1;
    this.levelText!.text = `Level: ${player.level} (${Math.round(this.currentProgress * 100)}%)`;
    this.progressBar.scaleX = this.currentProgress;

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

    let desiredProtectionState: 'none' | 'safezone' | 'collect' | 'respawnShield' | 'respawnShieldFading' | 'captureZone' | 'tutorial' = 'none';
    if ((player as any).isTutorial) {
      desiredProtectionState = 'tutorial';
    } else if (player.flags[FlagTypes.RespawnShield] === 2) {
      desiredProtectionState = 'respawnShieldFading';
    } else if (player.flags[FlagTypes.RespawnShield]) {
      desiredProtectionState = 'respawnShield';
    } else if (player.biome === BiomeTypes.Safezone) {
      desiredProtectionState = 'safezone';
    } else if (player.coins < 500) {
      desiredProtectionState = 'collect';
    } else if (inCaptureZone) {
      desiredProtectionState = 'captureZone';
    }

    const switchProtectionMessage = () => {
      const isMobile = this.game.isMobile;

      if (desiredProtectionState === 'tutorial') {
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
      } else if (desiredProtectionState === 'collect' && !isMobile) {
        this.inSafezoneMessage.setColor('#66ff66');
        this.inSafezoneMessage.setText(`You are fully protected — collect ${Math.max(0, 500 - player.coins)} more coins to start fighting`);
        this.game.tweens.add({
          targets: [this.inSafezoneMessage],
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
    } else if (desiredProtectionState === 'collect' && !this.game.isMobile) {
      this.inSafezoneMessage.setText(`You are protected: collect ${Math.max(0, 500 - player.coins)} more coins to start fighting`);
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
