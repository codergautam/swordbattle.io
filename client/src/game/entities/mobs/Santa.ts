import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class SantaMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 5) / this.body.height;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'santa').setOrigin(0.5, 0.3);
    this.body.setScale(this.baseScale);
    this.shadow = this.game.add.sprite(SantaMob.shadowOffsetX, SantaMob.shadowOffsetY, 'santaShadow').setOrigin(0.5, 0.3);
    this.shadow.setAlpha(0.15);
    this.shadow.setScale(this.baseScale);
    this.healthBar = new Health(this, {
      offsetY: this.shape.radius * 1.3,
      width: this.shape.radius * 3,
      height: this.shape.radius / 5,
    });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
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

export default SantaMob;
