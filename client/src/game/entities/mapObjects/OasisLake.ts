import { BaseEntity } from '../BaseEntity';
import { EntityDepth } from '..';
import { EntityTypes } from '../../Types';

class OasisLake extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    const size = (this.size as number) || this.shape.radius * 2;

    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'oasisDown').setOrigin(0.5, 0.5);
    this.container.scale = (size * 1.2) / this.container.width;
    this.container.setDepth(EntityDepth[EntityTypes.LavaPool] || 2);

    return this.container;
  }

  setDepth() {
  }
}

export default OasisLake;
