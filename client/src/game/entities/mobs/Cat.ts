import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class CatMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 15;
  static shadowOffsetY = 15;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, '').setOrigin(0.48, 0.6);
    this.updateSprite();
    this.shadow = this.game.add.sprite(CatMob.shadowOffsetX, CatMob.shadowOffsetY, 'catShadow').setOrigin(0.48, 0.6);
    this.shadow.setAlpha(0.1);
    this.shadow.setScale(this.body.scaleX, this.body.scaleY);
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

    const texture = this.isAngry ? 'catMobPassive' : 'catMobPassive';
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

export default CatMob;
