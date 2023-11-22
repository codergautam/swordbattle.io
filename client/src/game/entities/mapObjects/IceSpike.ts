import { BaseEntity } from '../BaseEntity';

class IceSpike extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'iceSpike').setOrigin(0.13, 0.8);
    this.container.scale = (this.size * 1.2) / this.container.width;
    return this.container;
  }
}

export default IceSpike;
