import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class BunnyMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 15;
  static shadowOffsetY = 15;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'bunny').setOrigin(0.48, 0.65);
    const scale = (this.shape.radius * 4) / this.body.height;
    this.body.setScale(scale);
    this.shadow = this.game.add.sprite(BunnyMob.shadowOffsetX, BunnyMob.shadowOffsetY, 'bunnyShadow').setOrigin(0.48, 0.65);
    this.shadow.setAlpha(0.1);
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

export default BunnyMob;
