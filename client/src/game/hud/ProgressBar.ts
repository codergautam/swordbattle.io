import HUD from './HUD';
import Game from '../scenes/Game';
import { BiomeTypes } from '../Types';

class ProgressBar {
  // Member Variables
  hud: HUD;
  game: Game;
  container: any;
  barBackground: any;
  progressBar: any;
  levelText!: Phaser.GameObjects.Text;
  inSafezoneMessage!: Phaser.GameObjects.Text;
  width = 500;
  height = 15;

  // Variables for smooth interpolation and level change tracking
  currentProgress: number = 0;
  targetProgress: number = 0;
  lastKnownLevel: number | null = null;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

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
    this.inSafezoneMessage = this.game.add.text(this.width / 2, -this.game.scale.height + 100, 'You are in the safe zone', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Create a container to house all of the above components
    this.container = this.game.add.container(0, 0, [this.barBackground, this.progressBar, this.levelText, this.inSafezoneMessage]);
    this.hud.add(this.container);
  }

  // Adjust the progress bar's position on window resize
  resize() {
    this.container.x = (this.game.scale.width - this.width) / 2;
    this.container.y = this.game.scale.height - this.height - 15;
  }

  toggleSafezoneText(show: boolean) {
    this.game.tweens.add({
      targets: [this.inSafezoneMessage],
      alpha: show ? 1 : 0,
      duration: 100,
    });
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!this.container || !player) return;

    // Calculate the raw progress
    this.targetProgress = Math.min((player.coins - player.previousLevelCoins) / (player.nextLevelCoins - player.previousLevelCoins), 1);

    // Check for a level-up event
    if (this.lastKnownLevel !== null && player.level > this.lastKnownLevel) {
      console.log('Level Up Event Logged');
    }
    this.lastKnownLevel = player.level;

    // Interpolation for smoother progress bar movement
    this.currentProgress += (this.targetProgress - this.currentProgress) * 0.1;
    this.levelText!.text = `Level: ${player.level} (${Math.round(this.currentProgress * 100)}%)`;
    this.progressBar.scaleX = this.currentProgress;

    // Update safezone message visibility
    const shouldShow = player.biome === BiomeTypes.Safezone && this.hud.evolutionSelect.hidden;
    const isShown = Boolean(this.inSafezoneMessage.alpha);
    if (isShown !== shouldShow) {
      this.toggleSafezoneText(shouldShow);
    }
  }
}

export default ProgressBar;
