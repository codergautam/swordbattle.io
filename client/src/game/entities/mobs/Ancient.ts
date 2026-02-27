import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class AncientMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 3) / this.body.width * 1.25;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'ancient').setOrigin(0.5, 0.5);
    this.shadow = this.game.add.sprite(AncientMob.shadowOffsetX, AncientMob.shadowOffsetY, 'ancientShadow').setOrigin(0.5, 0.5);
    this.shadow.setAlpha(0.175);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius * 1.25,
      width: this.shape.radius * 1.5,
      height: 50 * 1.25,
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

export default AncientMob;
