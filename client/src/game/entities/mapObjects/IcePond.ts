import { BaseEntity } from '../BaseEntity';

class IcePond extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'icePond').setOrigin(0.45, 0.3);
    this.container.scale = (this.size * 2) / this.container.width;
    return this.container;
  }
}

export default IcePond;
