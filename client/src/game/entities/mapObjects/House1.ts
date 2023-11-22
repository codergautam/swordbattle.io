import { BaseEntity } from '../BaseEntity';

class House1 extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'width', 'height'];

  houseSprite: Phaser.GameObjects.Sprite | null = null;
  roofSprite: Phaser.GameObjects.Sprite | null = null;
  isRoofTransparent: boolean = false;

  createSprite() {
    this.houseSprite = this.game.add.sprite(0, 0, 'house1').setOrigin(0).setDepth(1);
    this.roofSprite = this.game.add.sprite(0, 0, 'house1roof').setOrigin(0).setDepth(50);

    this.houseSprite.x = this.roofSprite.x = this.shape.x;
    this.houseSprite.y = this.roofSprite.y = this.shape.y;
    this.houseSprite.displayWidth = this.roofSprite.displayWidth = this.width;
    this.houseSprite.displayHeight = this.roofSprite.displayHeight = this.height;

    this.container = this.game.add.container(this.shape.x, this.shape.y, []);
  }

  update() {
    const self = this.game.gameState.self.entity;
    if (!self) return;

    let isRoofTransparent = self.depth === this.id;
    if (isRoofTransparent !== this.isRoofTransparent) {
      this.game.tweens.add({
        targets: this.roofSprite,
        alpha: isRoofTransparent ? 0 : 1,
        duration: 500,
      });
      this.isRoofTransparent = isRoofTransparent;
    }
  }

  remove() {
    this.roofSprite?.destroy();
    this.houseSprite?.destroy();
  }
}

export default House1;
