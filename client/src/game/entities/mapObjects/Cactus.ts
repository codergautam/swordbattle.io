import { BaseEntity } from '../BaseEntity';

class Cactus extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'cactus').setOrigin(0.5, 0.5);
    const size = (this.size as number) || (this.shape.radius * 2);
    this.body.setScale((size * 1.6) / this.body.width);
    this.shadow = this.createOutlineShadow('cactus', 0.5, 0.5);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {}

  update(dt: number) {
    super.update(dt);
  }
}

export default Cactus;
