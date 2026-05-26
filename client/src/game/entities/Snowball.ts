import { BaseEntity } from './BaseEntity';

class Snowball extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static baseAngle = -Math.PI / 2;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'snowball').setOrigin(0.5, 0);
    const scale = (this.shape.radius * 2) / this.body.width;
    this.body.setScale(scale);
    this.shadow = this.createOutlineShadow('snowball', 0.5, 0);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    this.container.setRotation(0);

    const startAngle = Phaser.Math.Angle.Wrap(this.body.rotation);
    const endAngle = Phaser.Math.Angle.Wrap(Snowball.baseAngle + this.angle);
    const rotation = Phaser.Math.Angle.RotateTo(startAngle, endAngle);
    this.body.setRotation(rotation);
    if (this.shadow) {
      this.shadow.setRotation(rotation);
    }
  }
}

export default Snowball;
