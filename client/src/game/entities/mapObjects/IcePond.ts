import { BaseEntity } from '../BaseEntity';

class IcePond extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'icePond').setOrigin(0, 0.9);
    this.container.scale = this.size / this.container.width;
    return this.container;
  }
}

export default IcePond;
