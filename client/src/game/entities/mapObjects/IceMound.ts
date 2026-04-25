import { BaseEntity } from '../BaseEntity';
import { TreeShake, shake } from '../../effects/TreeShake';

class IceMound extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];
  private shake?: TreeShake;

  createSprite() {
    // If sprite already exists, don't create a duplicate
    if (this.container) {
      return this.container;
    }

    const body = this.game.add.sprite(0, 0, 'iceMound').setOrigin(0.5, 0.5);
    body.setScale((this.shape.radius * 2 * 1.2) / body.width);
    const shadow = this.createOutlineShadow('iceMound', 0.5, 0.5);
    this.syncOutlineShadow(shadow, body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [shadow, body]);
    this.shake = new TreeShake(this, body, shadow, shake.snow);
    return this.container;
  }

  // Override to prevent alpha tweens from interfering with texture transparency
  updateWorldDepth() {
    // Ice mounds are always visible (depth 0), no alpha modification needed
  }

  updateRotation() {
  }

  update(dt: number) {
    super.update(dt);
    this.shake?.update(dt);
  }
}

export default IceMound;
