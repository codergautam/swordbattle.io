import { BaseEntity } from './BaseEntity';
import { Health } from '../components/Health';

class Chest extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'rarity'];
  static removeTransition = 250;

  sprite: Phaser.GameObjects.Sprite | null = null;

  createSprite() {
    let texture = 'chest' + (this.rarity + 1);
    this.sprite = this.game.add.sprite(0, 0, texture).setOrigin(0);
    this.healthBar = new Health(this, {
      hideWhenFull: false,
      width: this.sprite.width,
      height: 20,
      offsetX: this.sprite.width / 2,
      offsetY: -30,
      alwaysHide: this.rarity === 0
    });

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.sprite])
      .setScale(this.size / this.sprite.width);

    return this.container;
  }
}

export default Chest;
