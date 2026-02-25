import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class FishMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Graphics;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, '').setOrigin(0.48, 0.6);
    this.updateSprite();
    this.shadow = this.createShadow(Math.min(this.body.displayWidth, this.body.displayHeight) * 0.6, 0.18);
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

    const texture = this.isAngry ? 'angryFish' : 'angryFish';
    this.body.setTexture(texture).setScale((this.shape.radius * 6) / this.body.height);
  }
}

export default FishMob;
