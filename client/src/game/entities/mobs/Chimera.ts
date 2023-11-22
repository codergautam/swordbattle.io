import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class ChimeraMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  get baseScale() {
    return (this.shape.radius * 5) / this.body.height;
  }

  get flyingScale() {
    return this.baseScale * 1.5;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'chimera').setOrigin(0.5, 0.5);
    this.body.setScale(this.isAngry ? this.flyingScale : this.baseScale);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.body]);
    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (data.isAngry !== undefined) {
      this.updateScale();
    }
  }

  updateScale() {
    if (!this.body) return;

    this.game.tweens.add({
      targets: this.body,
      scale: this.isAngry ? this.flyingScale : this.baseScale,
      duration: 2500,
    });
  }
}

export default ChimeraMob;
