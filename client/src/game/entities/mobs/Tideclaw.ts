import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class Tideclaw extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'tideclaw').setOrigin(0.5, 0.57);
    this.body.setScale((this.shape.radius * 2.75) / this.body.height);
    this.shadow = this.createOutlineShadow('tideclaw', 0.5, 0.57, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default Tideclaw;
