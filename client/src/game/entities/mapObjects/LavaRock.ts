import { BaseEntity } from '../BaseEntity';

class LavaRock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'lavaRock').setOrigin(0.1, 0.6);
    this.container.scale = (this.size * 1.2) / this.container.width;
    return this.container;
  }
}

export default LavaRock;
