import { BaseEntity } from './BaseEntity';

class BishopBolt extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle'];

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'bishopBolt');
    const scale = (this.shape.radius * 2) / this.body.width;
    this.body.setScale(scale);
    this.shadow = this.createOutlineShadow('bishopBolt', 0.5, 0.5);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    this.container.setRotation(this.angle || 0);
    return this.container;
  }

  update(dt: number) {
    super.update(dt);
    if (this.container) this.container.setRotation(this.angle || 0);
  }
}

export default BishopBolt;
