import Game from '../scenes/Game';
import HUD from './HUD';

class ProgressBar {
  hud: HUD;
  game: Game;
  container: any;
  barBackground: any
  progressBar: any;
  levelText: Phaser.GameObjects.Text | null = null;
  width = 500;
  height = 15;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  initialize() {
    // Background bar
    this.barBackground = this.game.add.graphics();
    this.barBackground.lineStyle(4, 0x000000);
    this.barBackground.strokeRect(0, 0, this.width, this.height);
    this.barBackground.fillStyle(0xffffff);
    this.barBackground.fillRect(0, 0, this.width, this.height);

    // Progress bar
    this.progressBar = this.game.add.graphics();
    this.progressBar.fillStyle(0x00FFFF);
    this.progressBar.fillRect(0, 0, this.width, this.height);

    // Level text
    this.levelText = this.game.add.text(this.width / 2, -this.height - 10, '', {
      fontSize: 30,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.container = this.game.add.container(0, 0, [this.barBackground, this.progressBar, this.levelText]);
    this.hud.add(this.container);
  }

  resize() {
    this.container.x = (this.game.scale.width - this.width) / 2;
    this.container.y = this.game.scale.height - this.height - 15;
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!this.container || !player) return;

    const progress = Math.min((player.coins - player.previousLevelCoins) / (player.nextLevelCoins - player.previousLevelCoins), 1);
    this.levelText!.text = `Level: ${player.level} (${Math.round(progress * 100)}%)`;
    this.progressBar.scaleX = progress;
  }
}

export default ProgressBar;
