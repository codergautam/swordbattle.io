import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class MooseMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'moose').setOrigin(0.5, 0.5);
    const scale = (this.shape.radius * 5) / this.body.height;
    this.body.setScale(scale);
    this.shadow = this.game.add.sprite(MooseMob.shadowOffsetX, MooseMob.shadowOffsetY, 'mooseShadow').setOrigin(0.5, 0.5);
    this.shadow.setAlpha(0.15);
    this.shadow.setScale(scale);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
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

export default MooseMob;
