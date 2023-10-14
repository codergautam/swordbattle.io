import { BaseEntity } from './BaseEntity';

class Fireball extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];
  static baseAngle = -Math.PI / 2;

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'fireball');
    this.container.scale = (this.shape.radius * 2) / this.container.width;
    return this.container;
  }

  update(delta: number, time: number): void {
    super.update(delta, time);

    const startAngle = Phaser.Math.Angle.Wrap(this.container.rotation);
    const endAngle = Phaser.Math.Angle.Wrap(Fireball.baseAngle + this.angle);
    this.container.setRotation(Phaser.Math.Angle.RotateTo(startAngle, endAngle));
  }
}

export default Fireball;
