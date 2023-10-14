import { BaseEntity } from '../BaseEntity';

class MossyRock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'mossyRock').setOrigin(0.03, 0.96);
    this.container.scale = (this.size * 1.05) / this.container.width;
    return this.container;
  }
}

export default MossyRock;
