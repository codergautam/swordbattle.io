import { BaseEntity } from '../BaseEntity';

class MossyRock extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size'];

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  createSprite() {
    this.body = this.game.add.sprite(0, 0, 'mossyRock').setOrigin(0.03, 0.96);
    this.body.setScale((this.size * 1.05) / this.body.width);
    this.shadow = this.createOutlineShadow('mossyRock', 0.03, 0.96);
    this.syncOutlineShadow(this.shadow, this.body);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {}
}

export default MossyRock;
