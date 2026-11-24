import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class TurkeyMob extends BaseEntity {
  static stateFields = [
    ...BaseEntity.stateFields,
    'angle',
    'hitsRemaining',
  ];

  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game
      .add
      .sprite(0, 0, 'turkey')
      .setOrigin(0.48, 0.65);

    const scale = (this.shape.radius * 4) / this.body.height;
    this.body.setScale(scale);

    this.shadow = this.createOutlineShadow(
      'turkey',
      0.48,
      0.65,
      { living: true }
    );

    this.syncOutlineShadow(this.shadow, this.body);

    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius - 40,
    });

    this.container = this.game.add.container(
      this.shape.x,
      this.shape.y,
      [this.shadow, this.body]
    );

    return this.container;
  }

  updateRotation() {
    if (!this.body) return;

    super.updateRotation();

    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default TurkeyMob;