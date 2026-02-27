import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class WolfMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  static shadowOffsetX = 20;
  static shadowOffsetY = 20;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, '').setOrigin(0.48, 0.52);
    this.shadow = this.game.add.sprite(WolfMob.shadowOffsetX, WolfMob.shadowOffsetY, 'wolfShadow').setOrigin(0.48, 0.52);
    this.shadow.setAlpha(0.12);
    this.updateSprite();
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (data.isAngry !== undefined) {
      this.updateSprite();
    }
  }

  updateSprite() {
    if (!this.body) return;

    const texture = this.isAngry ? 'wolfMobAggressive' : 'wolfMobPassive';
    const scale = (this.shape.radius * 6) / this.body.height;
    this.body.setTexture(texture).setScale(scale);
    if (this.shadow) {
      this.shadow.setScale(scale);
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

export default WolfMob;
