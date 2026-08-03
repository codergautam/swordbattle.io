import { BaseEntity } from './BaseEntity';
import Sword from './Sword';

class SwordProj extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'skin'];
  static baseAngle = -Math.PI / 2;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    const bodyKey = this.skin === 2 && this.game.textures.exists('swordProjDirt')
      ? 'swordProjDirt' : 'swordProj';
    this.body = this.game.add.sprite(0, 0, bodyKey);
    const scale = (this.shape.radius * 2) / this.body.width;
    this.body.setScale(scale);
    this.shadow = this.createOutlineShadow(bodyKey, 0.5, 0.5);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    this.container.setRotation(0);

    const startAngle = Phaser.Math.Angle.Wrap(this.body.rotation);
    const endAngle = Phaser.Math.Angle.Wrap(SwordProj.baseAngle + this.angle);
    const rotation = Phaser.Math.Angle.RotateTo(startAngle, endAngle);
    this.body.setRotation(rotation);
    if (this.shadow) {
      this.shadow.setRotation(rotation);
    }
  }
}

export default SwordProj;
