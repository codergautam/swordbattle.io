import { BaseEntity } from '../BaseEntity';

class LavaPool extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'lavaPool').setOrigin(0.42, 0.2);
    this.container.scale = this.size / this.container.width;
    return this.container;
  }
}

export default LavaPool;
