import { BaseEntity } from '../BaseEntity';

class Rock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'rock').setOrigin(0.15, 0.1);
    this.container.scale = this.size / this.container.width;
    this.container.scaleX *= 1.1;
    return this.container;
  }
}

export default Rock;
