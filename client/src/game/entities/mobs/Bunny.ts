import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class BunnyMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'bunny').setOrigin(0.48, 0.65);
    this.body.setScale((this.shape.radius * 4) / this.body.height);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.body]);
    return this.container;
  }
}

export default BunnyMob;
