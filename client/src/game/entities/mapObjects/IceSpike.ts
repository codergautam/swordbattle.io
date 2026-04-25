import { BaseEntity } from '../BaseEntity';

class IceSpike extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  body!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'iceSpike').setOrigin(0.13, 0.8);
    this.body.setScale((this.size * 1.2) / this.body.width);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.body]);
    return this.container;
  }

  updateRotation() {}
}

export default IceSpike;
