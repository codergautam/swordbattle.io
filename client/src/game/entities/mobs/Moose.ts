import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class MooseMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'moose').setOrigin(0.5, 0.5);
    this.body.setScale((this.shape.radius * 5) / this.body.height);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.body]);
    return this.container;
  }
}

export default MooseMob;
