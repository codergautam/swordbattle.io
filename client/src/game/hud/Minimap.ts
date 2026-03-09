import HudComponent from './HudComponent';
import GlobalEntity from '../entities/GlobalEntity';
import { BiomeTypes, EntityTypes } from '../Types';
import { config } from '../../config';

class Minimap extends HudComponent {
  graphics: Phaser.GameObjects.Graphics | null = null;
  mapBackground: Phaser.GameObjects.Graphics | null = null;
  mapContainer: Phaser.GameObjects.Container | null = null;
  crown: Phaser.GameObjects.Sprite | null = null;
  toggleButton!: Phaser.GameObjects.Text;
  leftArrow!: Phaser.GameObjects.Text;
  rightArrow!: Phaser.GameObjects.Text;
  crownSpeed: number = 500;
  width: number = 200;
  height: number = 200;
  scaleX = 0;
  scaleY = 0;
  minimized = false;

  initialize() {
    const arrowStyle = {
      fontSize: 16,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    };

    this.leftArrow = this.hud.scene.add.text(0, 0, '\u25BC', arrowStyle);
    this.rightArrow = this.hud.scene.add.text(0, 0, '\u25BC', arrowStyle);

    this.toggleButton = this.hud.scene.add.text(this.width - 115, -25, 'Minimap', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
      .setInteractive()
      .on('pointerover', () => {
        const shift = this.minimized ? -3 : 3;
        this.game.add.tween({ targets: [this.leftArrow, this.rightArrow], y: this.leftArrow.y + shift, duration: 100 });
      })
      .on('pointerout', () => {
        this.updateArrows();
      })
      .on('pointerdown', () => this.toggleMinimize());

    this.updateArrows();

    this.mapBackground = this.game.add.graphics()
    this.mapBackground.lineStyle(6, 0x000000);
    this.mapBackground.strokeRect(0, 0, this.width, this.height);

    this.crown = this.game.add.sprite(0, 0, 'crown').setScale(0.3);
    this.graphics = this.game.add.graphics();
    this.mapContainer = this.game.add.container();
    this.container = this.game.add.container(0, 0, [this.leftArrow, this.rightArrow, this.toggleButton, this.mapBackground, this.mapContainer, this.graphics, this.crown])
    this.hud.add(this.container);
  }

  updateArrows() {
    const arrow = this.minimized ? '\u25B2' : '\u25BC';
    this.leftArrow.setText(arrow);
    this.rightArrow.setText(arrow);
    const btnX = this.toggleButton.x;
    const btnY = this.toggleButton.y;
    const btnW = this.toggleButton.width;
    this.leftArrow.setPosition(btnX - 18, btnY + 3);
    this.rightArrow.setPosition(btnX + btnW + 5, btnY + 3);
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.updateArrows();

    this.hud.scene!.tweens.add({
      targets: [this.mapBackground, this.mapContainer, this.graphics, this.crown],
      alpha: this.minimized ? 0 : 1,
      duration: 250,
    });
    const targetY = (this.minimized ? this.height : 0) - 25;
    this.hud.scene!.tweens.add({
      targets: this.toggleButton,
      y: targetY,
      duration: 400,
    });
    this.hud.scene!.tweens.add({
      targets: [this.leftArrow, this.rightArrow],
      y: targetY + 3,
      duration: 400,
    });
    this.hud.scene!.tweens.add({
      targets: this.leftArrow,
      x: this.toggleButton.x - 18,
      duration: 400,
    });
    this.hud.scene!.tweens.add({
      targets: this.rightArrow,
      x: this.toggleButton.x + this.toggleButton.width + 5,
      duration: 400,
    });
  }

  resize() {
    if (!this.container) return;

    const x = this.game.scale.width - (this.width * this.scale) - 10;
    const mobileOffset = this.game.isMobile ? 120 * this.scale : 0;
    const y = this.game.scale.height - (this.height * this.scale) - 10 - mobileOffset;
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

  updateGlobalEntities() {
    const globalEntities = this.game.gameState.globalEntities;
    for (const id in globalEntities) {
      const entity = globalEntities[id];
      if (entity.type === EntityTypes.Player) continue;

      if (!entity.container) {
        try {
        const sprite = entity.createSprite();
        this.mapContainer?.add(sprite);
        } catch (e) {
          console.error('Failed to add mm entity', e);
        }
      }
    }
  }

  update(dt: number) {
    if (!this.graphics) return;

    const { graphics } = this;
    const map = this.game.gameState.gameMap;
    this.updateGlobalEntities();

    graphics.clear();
    graphics.lineStyle(1, 0x000000);

    const globalEntities = this.game.gameState.globalEntities;
    let leader;
    let leaderDotVisible = true;
    for (const id in globalEntities) {
      const player = globalEntities[id] as any;
      if (player.type !== EntityTypes.Player) continue;
      const playerX = (player.shape.x - map.x) * this.scaleX;
      const playerY = (player.shape.y - map.y) * this.scaleY;
      const isSelf = player.id === this.game.gameState.self.id;
      const scale = this.scaleX * (isSelf ? 3 : 2);
      const dotRadius = player.shape.radius * scale;

      // Hide dot if too small
      if (dotRadius < 1) {
        if (!leader || (player.coins > leader.coins)) {
          leader = player;
          leaderDotVisible = false;
        }
        continue;
      }

      graphics.fillStyle(isSelf ? 0xffffff : 0xff0000);
      graphics.fillCircle(playerX, playerY, dotRadius);
      graphics.stroke();

      if (!leader || (player.coins > leader.coins)) {
        leader = player;
        leaderDotVisible = true;
      }
    }

    if (leader && leaderDotVisible) {
      this.updateCrown(leader, dt);
      if (this.crown) this.crown.setVisible(true);
    } else {
      if (this.crown) this.crown.setVisible(false);
    }
  }

  removeGlobalEntity(entity: GlobalEntity) {
    this.mapContainer?.remove(entity.container);
  }
}

export default Minimap;
