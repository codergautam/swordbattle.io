import { BiomeTypes, EntityTypes } from '../Types';
import Game from '../scenes/Game';
import HUD from './HUD';

class Minimap {
  hud: HUD;
  game: Game;
  graphics: Phaser.GameObjects.Graphics | null = null;
  mapBackground: Phaser.GameObjects.Graphics | null = null;
  mapContainer: Phaser.GameObjects.Container | null = null;
  container: Phaser.GameObjects.Container | null = null;
  crown: Phaser.GameObjects.Sprite | null = null;
  crownSpeed: number = 500;
  width: number = 250;
  height: number = 250;
  scaleX = 0;
  scaleY = 0;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  initialize() {
    this.mapBackground = this.game.add.graphics();
    this.mapBackground.lineStyle(2, 0x96e398);
    this.mapBackground.strokeRect(0, 0, this.width, this.height);

    this.crown = this.game.add.sprite(0, 0, 'crown').setScale(0.3);
    this.graphics = this.game.add.graphics();
    this.mapContainer = this.game.add.container();
    this.container = this.game.add.container(0, 0, [this.mapBackground, this.mapContainer, this.graphics, this.crown]);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;

    const x = this.game.scale.width - this.width - 10;
    const y = this.game.scale.height - this.height - 10;
    this.container.setPosition(x, y);
  }

  updateMapData() {
    if (!this.mapContainer) return;

    const map = this.game.gameState.gameMap;
    this.scaleX = this.width / map.width;
    this.scaleY = this.height / map.height;

    this.mapContainer.removeAll(true);
    this.mapContainer.setScale(this.scaleX, this.scaleY);
    this.mapContainer.setPosition(-map.x * this.scaleX, -map.y * this.scaleY);

    for (const biome of map.biomes) {
      let color = 0x4854a2;
      switch (biome.type) {
        case BiomeTypes.Fire: color = 0x9a2c13; break;
        case BiomeTypes.Earth: color = 0x1aad41; break;
        case BiomeTypes.Ice: color = 0xffffff; break;
        case BiomeTypes.River: color = 0x4854a2; break;
        case BiomeTypes.Safezone: color = 0x999999; break;
      }
  
      const graphics = this.game.add.graphics();
      graphics.fillStyle(color);
      biome.shape.fillShape(graphics);
      this.mapContainer.add(graphics);
    }

    for (const staticObject of map.staticObjects) {
      const container = staticObject.createSprite();
      this.mapContainer.add(container);
    }
  }

  updateCrown(player: any, dt: number) {
    if (!this.crown || !this.mapContainer) return;
    const lerpFactor = dt / this.crownSpeed;

    const targetX = this.mapContainer.x + player.shape.x * this.scaleX;
    const targetY = this.mapContainer.y + player.shape.y * this.scaleY;
  
    this.crown.x += (targetX - this.crown.x) * lerpFactor;
    this.crown.y += (targetY - this.crown.y) * lerpFactor;
  }

  updateSprites() {
    // update bosses here
  }
  
  update(dt: number) {
    if (!this.graphics) return;

    const { graphics } = this;
    const map = this.game.gameState.gameMap;

    graphics.clear();
    graphics.lineStyle(1, 0x000000);
    
    const players = Object.values(this.game.gameState.globalEntities)
      // .filter(entity => entity.type === EntityTypes.Player);
    let leader;
    for (const player of players) {
      const playerX = (player.shape.x - map.x) * this.scaleX;
      const playerY = (player.shape.y - map.y) * this.scaleY;
      const isSelf = player.id === this.game.gameState.self.id;
      const scale = this.scaleX * (isSelf ? 3 : 2);
      graphics.fillStyle(isSelf ? 0xffffff : 0xff0000);
      graphics.fillCircle(playerX, playerY, player.shape.radius * scale);
      graphics.stroke();

      if (player.type === EntityTypes.Player) {
        if (!leader || (player.coins > leader.coins)) {
          leader = player;
        }
      }
    }
    if (leader) {
      this.updateCrown(leader, dt);
    }
  }
}

export default Minimap;
