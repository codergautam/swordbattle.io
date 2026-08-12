import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class Stormray extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry', 'diving'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'stormray').setOrigin(0.5, 0.55);
    this.body.setScale((this.shape.radius * 2.65) / this.body.height);
    this.shadow = this.createOutlineShadow('stormray', 0.5, 0.55, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 44 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    super.updateRotation();
    const pulse = this.diving ? 1.08 : 1;
    this.body.setScale((this.shape.radius * 2.65) / this.body.height * pulse);
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default Stormray;
