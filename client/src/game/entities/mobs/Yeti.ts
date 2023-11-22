import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class YetiMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 5) / this.body.height;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'yeti').setOrigin(0.5, 0.7);
    this.body.setScale(this.baseScale);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius * 1.3,
      width: this.shape.radius * 3,
      height: this.shape.radius / 5,
    });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.body]);
    return this.container;
  }
}

export default YetiMob;
