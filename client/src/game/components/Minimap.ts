import Game from '../scenes/Game';
import HUD from './HUD';

class Minimap {
  hud: HUD;
  game: Game;
  graphics: Phaser.GameObjects.Graphics | null = null;
  container: Phaser.GameObjects.Container | null = null;
  width: number = 300;
  height: number = 300;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  initialize() {
    this.graphics = this.game.add.graphics();
    this.container = this.game.add.container();
    this.container.add(this.graphics);
    this.hud.add(this.container);
  }

  resize() {}
  
  update() {
    if (!this.graphics) return;

    const { graphics } = this;
    const x = this.game.scale.width - this.width - 10;
    const y = this.game.scale.height - this.height - 10;
    const mapWidth = this.game.physics.world.bounds.width;
    const mapHeight = this.game.physics.world.bounds.height;
    const scaleX = this.width / mapWidth;
    const scaleY = this.height / mapHeight;

    graphics.clear();
    graphics.lineStyle(3, 0xffffff);
    graphics.strokeRect(x, y, this.width, this.height);
    
    // In case to handle 150+ players this can be optimized (rerender only changed players)
    const players = this.game.gameState.getPlayers();
    for (const player of players) {
      const playerX = player.x * scaleX;
      const playerY = player.y * scaleY;
      const isSelf = player.id === this.game.gameState.self.id;
      graphics.fillStyle(isSelf ? 0xffffff : 0xff0000);
      graphics.fillCircle(x + playerX, y + playerY, player.radius * scaleX);
    }
  }
}

export default Minimap;
