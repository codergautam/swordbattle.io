import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class RokuMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 3) / this.body.width;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'roku').setOrigin(0.5, 0.5);
    this.shadow = this.game.add.sprite(RokuMob.shadowOffsetX, RokuMob.shadowOffsetY, 'rokuShadow').setOrigin(0.5, 0.5);
    this.shadow.setAlpha(0.175);
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
    if (this.shadow) {
      this.shadow.setRotation(this.body.rotation);
    }
  }
}

export default RokuMob;
