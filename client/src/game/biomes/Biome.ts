import { BiomeTypes } from '../Types';
import { Shape, ShapeType } from '../physics/Shape';
import Game from '../scenes/Game';
import River from './River';

export type BiomeType = Biome | River;

const containers: Phaser.GameObjects.TileSprite[] = [];
const biomesCount = 8;

class Biome {
  scene: Game;
  container: Phaser.GameObjects.TileSprite | null = null;
  type: BiomeTypes;
  shape: ShapeType;
  viewportSize: { width: number, height: number };
  zIndex = -3;
  tileScale = 2;

  constructor(game: Game, biomeData: any) {
    this.scene = game;
    this.type = biomeData.type;
    this.shape = Shape.create(biomeData.shapeData);
    this.viewportSize = {
      width: this.scene.scale.width,
      height: this.scene.scale.height,
    };
  }

  static initialize(scene: Phaser.Scene) {
    for (let i = 0; i < biomesCount; i++) {
      containers.push(scene.add.tileSprite(0, 0, 0, 0, '').setVisible(false));
    }
  }

  createSprite() {
    let texture = '';
    switch (this.type) {
      case BiomeTypes.Fire: texture = 'fireTile'; break;
      case BiomeTypes.Earth: texture = 'earthTile'; break;
      case BiomeTypes.Ice: texture = 'iceTile'; break;
      case BiomeTypes.River: texture = 'river'; break;
      case BiomeTypes.Safezone: texture = 'safezone'; break;
    }

    const graphics = this.scene.make.graphics();
    graphics.fillStyle(0xffffff);
    this.shape.fillShape(graphics);
    const mask = new Phaser.Display.Masks.GeometryMask(this.scene, graphics);

    this.container = containers.pop()!
      .setTexture(texture)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(this.zIndex)
      .setMask(mask)
    this.resize();
  }

  resize() {
    if (!this.container) return;
    const camera = this.scene.cameras.main;
    this.container.setSize(camera.width, camera.height);
    this.container.setPosition(camera.width / 2, camera.height / 2);
  }

  update() {
    if (!this.container) return;

    const camera = this.scene.cameras.main;
    const isInViewport = this.shape.isInViewport(camera);
    this.container.setVisible(isInViewport);

    if (isInViewport) {
      this.container.setDisplaySize(camera.displayWidth, camera.displayHeight);
      this.container.setTileScale(camera.zoom * this.tileScale);
      this.container.setTilePosition(
        (camera.scrollX - camera.displayWidth / 2) / this.tileScale,
        (camera.scrollY - camera.displayHeight / 2) / this.tileScale);
    }
  }
}

export default Biome;
