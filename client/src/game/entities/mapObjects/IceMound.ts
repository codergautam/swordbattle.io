import { BaseEntity } from '../BaseEntity';

class IceMound extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'iceMound');
    this.container.scale = (this.shape.radius * 2 * 1.2) / this.container.width;
    return this.container;
  }
}

export default IceMound;
