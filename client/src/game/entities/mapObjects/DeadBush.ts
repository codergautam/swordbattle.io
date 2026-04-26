import { BaseEntity } from '../BaseEntity';
import { TreeShake, shake } from '../../effects/TreeShake';

class DeadBush extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;
  private shake?: TreeShake;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'deadBush').setOrigin(0.5, 0.5);
    this.body.setScale((this.shape.radius * 2 * 1.5) / this.body.width);
    this.shadow = this.createOutlineShadow('deadBush', 0.5, 0.5);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    this.shake = new TreeShake(this, this.body, this.shadow, shake.stick);
    return this.container;
  }

  updateWorldDepth() {}
  updateRotation() {}

  update(dt: number) {
    super.update(dt);
    this.shake?.update(dt);
  }
}

export default DeadBush;
