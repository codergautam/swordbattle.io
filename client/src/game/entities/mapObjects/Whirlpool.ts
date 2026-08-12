import { BaseEntity } from '../BaseEntity';

class Whirlpool extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];
  sprite!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.sprite = this.game.add.sprite(this.shape.x, this.shape.y, 'whirlpool').setOrigin(0.5);
    this.sprite.setScale((this.size * 2) / this.sprite.width);
    this.container = this.sprite;
    return this.container;
  }

  update(dt: number) {
    super.update(dt);
    if (this.sprite) this.sprite.rotation += dt * 0.0012;
  }
}

export default Whirlpool;
