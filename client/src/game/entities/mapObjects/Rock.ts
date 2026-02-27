import { BaseEntity } from '../BaseEntity';

class Rock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'rock').setOrigin(0.15, 0.1);
    this.shadow = this.game.add.sprite(Rock.shadowOffsetX, Rock.shadowOffsetY, 'rockShadow').setOrigin(0.15, 0.1);
    this.shadow.setAlpha(0.1);
    const scale = this.size / this.body.width;
    this.body.setScale(scale * 1.1, scale);
    this.shadow.setScale(scale * 1.1, scale);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {}
}

export default Rock;
