import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class AncientMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 3) / this.body.width * 1.25;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'ancient').setOrigin(0.5, 0.5);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius * 1.25,
      width: this.shape.radius * 1.5,
      height: 50 * 1.25,
    });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.body]).setScale(this.baseScale);
    return this.container;
  }
}

export default AncientMob;
