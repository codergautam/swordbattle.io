import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class ChimeraMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Graphics;

  get baseScale() {
    return (this.shape.radius * 5) / this.body.height;
  }

  get flyingScale() {
    return this.baseScale * 1.5;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'chimera').setOrigin(0.5, 0.5);
    this.body.setScale(this.isAngry ? this.flyingScale : this.baseScale);
    this.shadow = this.createShadow(Math.min(this.body.displayWidth, this.body.displayHeight) * 0.35);
    if (this.isAngry) {
      this.shadow.setScale(1.3);
      this.shadow.setAlpha(0.15);
    }
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 300 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
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

    if (this.shadow) {
      this.game.tweens.add({
        targets: this.shadow,
        scaleX: this.isAngry ? 1.3 : 1,
        scaleY: this.isAngry ? 1.3 : 1,
        alpha: this.isAngry ? 0.15 : 0.25,
        duration: 2500,
      });
    }
  }
}

export default ChimeraMob;
