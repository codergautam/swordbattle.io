import { BaseEntity } from './BaseEntity';

class Boulder extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static baseAngle = -Math.PI / 2;

  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'boulder');
    this.shadow = this.game.add.sprite(Boulder.shadowOffsetX, Boulder.shadowOffsetY, 'boulderShadow');
    this.shadow.setAlpha(0.15);
    const scale = (this.shape.radius * 2.75) / this.body.width;
    this.body.setScale(scale);
    this.shadow.setScale(scale);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    this.container.setRotation(0);

    const startAngle = Phaser.Math.Angle.Wrap(this.body.rotation);
    const endAngle = Phaser.Math.Angle.Wrap(Boulder.baseAngle + this.angle);
    const rotation = Phaser.Math.Angle.RotateTo(startAngle, endAngle);
    this.body.setRotation(rotation);
    if (this.shadow) {
      this.shadow.setRotation(rotation);
    }
  }
}

export default Boulder;
