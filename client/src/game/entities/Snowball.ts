import { BaseEntity } from './BaseEntity';

class Snowball extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static baseAngle = -Math.PI / 2;

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'snowball').setOrigin(0.5, 0)
    this.container.scale = (this.shape.radius * 2) / this.container.width;
    return this.container;
  }

  update(dt: number) {
    super.update(dt);

    const startAngle = Phaser.Math.Angle.Wrap(this.container.rotation);
    const endAngle = Phaser.Math.Angle.Wrap(Snowball.baseAngle + this.angle);
    this.container.setRotation(Phaser.Math.Angle.RotateTo(startAngle, endAngle));
  }
}

export default Snowball;
