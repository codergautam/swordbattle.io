import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class ChimeraMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 5) / this.body.height;
  }

  get flyingScale() {
    return this.baseScale * 1.5;
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'chimera').setOrigin(0.5, 0.5);
    const initialScale = this.isAngry ? this.flyingScale : this.baseScale;
    this.body.setScale(initialScale);
    this.shadow = this.game.add.sprite(ChimeraMob.shadowOffsetX, ChimeraMob.shadowOffsetY, 'chimeraShadow').setOrigin(0.5, 0.5);
    this.shadow.setScale(this.isAngry ? initialScale * 1.3 : initialScale);
    this.shadow.setAlpha(this.isAngry ? 0.1 : 0.15);
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
        scaleX: this.isAngry ? this.flyingScale * 1.3 : this.baseScale,
        scaleY: this.isAngry ? this.flyingScale * 1.3 : this.baseScale,
        alpha: this.isAngry ? 0.1 : 0.15,
        duration: 2500,
      });
    }
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    if (this.shadow) {
      this.shadow.setRotation(this.body.rotation);
    }
  }
}

export default ChimeraMob;
