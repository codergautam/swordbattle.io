import { BaseEntity } from './BaseEntity';

class Chest extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'rarity', 'health', 'maxHealth'];

  healthBar: Phaser.GameObjects.Graphics | null = null;
  sprite: Phaser.GameObjects.Sprite | null = null;
  barWidth = 200;

  createSprite() {
    let texture = 'chest' + (this.rarity + 1);

    this.sprite = this.game.add.sprite(0, 0, texture).setOrigin(0)
    this.healthBar = this.game.add.graphics()
      .setPosition((this.sprite.width - this.barWidth) / 2, -50);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.sprite, this.healthBar])
      .setScale(this.size / this.sprite.width);

    this.updateHealth();

    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (data.health !== undefined) {
      this.updateHealth();
    }
  }

  updateHealth() {
    if (!this.healthBar) return;

    const healthPercent = this.health / this.maxHealth;
    let healthColor = 65280;
    if (healthPercent < 0.3) {
      healthColor = 16711680;
    } else if (healthPercent < 0.5) {
      healthColor = 16776960;
    }

    this.healthBar.clear();
    this.healthBar.lineStyle(4, 0x000000);
    this.healthBar.strokeRect(0, 0, this.barWidth, 30);
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(0, 0, this.barWidth * healthPercent, 30);
  }
}

export default Chest;
