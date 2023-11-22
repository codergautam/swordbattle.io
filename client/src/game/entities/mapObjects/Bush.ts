import { BaseEntity } from '../BaseEntity';

class Bush extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'bush');
    this.container.scale = (this.shape.radius * 2 * 1.5) / this.container.width;
    return this.container;
  }
}

export default Bush;
