import { BaseEntity } from '../BaseEntity';

class Pond extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'pond').setOrigin(0.37, 0.25);
    this.container.scale = this.size / this.container.width;
    return this.container;
  }
}

export default Pond;
