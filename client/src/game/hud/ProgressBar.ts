import HudComponent from './HudComponent';
import { BiomeTypes, FlagTypes } from '../Types';

class ProgressBar extends HudComponent {
  barBackground: any;
  progressBar!: Phaser.GameObjects.Graphics;
  progressBarContainer!: Phaser.GameObjects.Container;
  levelText!: Phaser.GameObjects.Text;
  levelTextTween!: Phaser.Tweens.Tween;
  levelUpText!: Phaser.GameObjects.Text;
  stabbedText!: Phaser.GameObjects.Text;
  inSafezoneMessage!: Phaser.GameObjects.Text;
  tipText!: Phaser.GameObjects.Text;
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
  currentProtectionMessage: 'none' | 'safezone' | 'collect' = 'none';

  initialize() {
    // Create the background bar
    this.barBackground = this.game.add.graphics();
    this.barBackground.lineStyle(4, 0x000000);
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
    this.inSafezoneMessage = this.game.add.text(this.width / 2, -this.height - 60, 'You are protected: you are in the safezone', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tipText = this.game.add.text(this.width / 2, -this.height - 40, 'Find chests or stab mobs to get coins faster', {
      fontSize: 18,
      fontStyle: 'normal',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setVisible(false);

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

    this.progressBarContainer = this.hud.scene.add.container(0, 0, [this.barBackground, this.progressBar, this.levelText, this.inSafezoneMessage, this.tipText]);
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

    if(this.game.hud.buffsSelect.minimized) this.game.hud.buffsSelect.toggleMinimize();

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

    let desiredProtectionState: 'none' | 'safezone' | 'collect' = 'none';
    if (player.biome === BiomeTypes.Safezone) {
      desiredProtectionState = 'safezone';
    } else if (player.coins < 500) {
      desiredProtectionState = 'collect';
    }

    const switchProtectionMessage = () => {
      if (desiredProtectionState === 'safezone') {
        this.inSafezoneMessage.setText('You are protected: you are in the safezone');
        this.tipText.setVisible(false).setAlpha(0);
        this.game.tweens.add({
          targets: this.inSafezoneMessage,
          alpha: 1,
          duration: 200,
        });
      } else if (desiredProtectionState === 'collect') {
        const coinsLeft = Math.max(0, 500 - player.coins);
        this.inSafezoneMessage.setText(`You are protected: collect ${coinsLeft} more coins to fight other players`);
        this.tipText.setText('Find chests or stab mobs to get coins faster').setVisible(true);
        this.game.tweens.add({
          targets: [this.inSafezoneMessage, this.tipText],
          alpha: 1,
          duration: 200,
        });
      } else {
        // hide both
        this.game.tweens.add({
          targets: [this.inSafezoneMessage, this.tipText],
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
          targets: [this.inSafezoneMessage, this.tipText],
          alpha: 0,
          duration: 200,
          onComplete: switchProtectionMessage,
        });
      }
    } else if (desiredProtectionState === 'collect') {
      const coinsLeft = Math.max(0, 500 - player.coins);
      this.inSafezoneMessage.setText(`You are protected: collect ${coinsLeft} more coins to fight other players`);
    }

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
