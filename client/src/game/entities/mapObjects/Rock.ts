import { BaseEntity } from '../BaseEntity';

class Rock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'rock').setOrigin(0.15, 0.1);
    const scale = this.size / this.body.width;
    this.body.setScale(scale * 1.1, scale);
    this.shadow = this.createOutlineShadow('rock', 0.15, 0.1);
    this.syncOutlineShadow(this.shadow, this.body);

    const a = (this.shape as any).angle || 0;
    const d = this.body.displayHeight * BaseEntity.shadow.shiftRatio;
    this.shadow.setPosition(
      this.shadow.x + Math.sin(a) * d,
      this.shadow.y - d + Math.cos(a) * d,
    );

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {}
}

export default Rock;
