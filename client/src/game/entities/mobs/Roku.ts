import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class RokuMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 3) / this.body.width;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'roku').setOrigin(0.5, 0.5);
    this.shadow = this.createOutlineShadow('roku', 0.5, 0.5, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius,
      width: this.shape.radius,
      height: 50,
    });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]).setScale(this.baseScale);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default RokuMob;
