import { BaseEntity } from './BaseEntity';

class Sword extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'isFlying'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'sword')
      .setOrigin(-0.2, 0.5);
    return this.container;
  }

  update(delta: number, time: number) {
    super.update(delta, time);

    this.container.scale = (this.size * 3) / this.container.width;
    this.container.setVisible(this.isFlying);
    this.container.setRotation(this.shape.angle - Math.PI / 4);
  }
}

export default Sword;
