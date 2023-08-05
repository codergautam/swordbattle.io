import Game from '../scenes/Game';
import HUD from './HUD';

class Level {
  hud: HUD;
  game: Game;
  levelSprite: any;
  graphics: Phaser.GameObjects.Graphics | null = null;
  container: Phaser.GameObjects.Container | null = null;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  initialize() {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: 40,
      fontFamily: 'Arial',
      color: '#ffffff',
    };
    this.levelSprite = this.game.add.text(0, 0, '', style);
    this.graphics = this.game.add.graphics();
    this.container = this.game.add.container(0, 0, [this.levelSprite, this.graphics]);
    this.hud.add(this.container);
  }

  resize() {}

  update() {
    if (!this.graphics) return;

    const { graphics } = this;
    const width = this.game.scale.width * 0.6;
    const height = 30;
    const x = (this.game.scale.width - width) / 2;
    const y = this.game.scale.height - height - 10;
    const level = this.game.gameState.self.entity?.level;

    this.levelSprite.setPosition(x + width / 2 - 20, y - 50);
    this.levelSprite.text = `Level ${Math.floor(level)}`;

    graphics.clear();
    graphics.lineStyle(2, 0x000000);
    graphics.fillStyle(0xffffff, 1.0);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(0x00ff00, 1.0);
    graphics.fillRect(x, y, width * (level - Math.floor(level)), height);
    graphics.strokeRect(x, y, width, height);
  }
}

export default Level;