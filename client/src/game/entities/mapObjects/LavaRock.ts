import { BaseEntity } from '../BaseEntity';

class LavaRock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'lavaRock').setOrigin(0.1, 0.6);
    this.body.setScale((this.size * 1.2) / this.body.width);
    this.shadow = this.createOutlineShadow('lavaRock', 0.1, 0.6);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {}
}

export default LavaRock;
