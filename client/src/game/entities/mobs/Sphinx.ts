import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class SphinxMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'sphinx').setOrigin(0.5, 0.5);
    const scale = (this.shape.radius * 2) / this.body.width;
    this.body.setScale(scale);
    this.shadow = this.createOutlineShadow('sphinx', 0.5, 0.5, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius - 40,
      width: this.shape.radius * 2.5,
      height: 50,
    });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default SphinxMob;
