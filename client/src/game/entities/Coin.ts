import { BaseEntity } from './BaseEntity';

class Coin extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'radius'];

  hunter: any = null;
  eatingTween: Phaser.Tweens.Tween | null = null;

  createSprite() {
    this.container = this.game.physics.add.sprite(this.x, this.y, 'coin');
    this.container.scale = (this.radius * 2) / this.container.width;
    this.eatingTween = this.game.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 200,
      repeat: 0,
    });
    this.eatingTween.pause();
    return this.container;
  }

  update() {
    if (!this.eatingTween) return;

    if (this.removed) {
      const { hunter } = this;
      if (hunter) {
        if (hunter.isMe) {
          this.game.soundManager.playCoin();
        }
        this.eatingTween.resume();

        const diffX = hunter.x - this.x;
        const diffY = hunter.y - this.y;
        const angle = Math.atan2(diffY, diffX);
        const value = this.eatingTween.getValue();
        this.container.x = this.x + Math.abs(diffX) * Math.cos(angle) * value;
        this.container.y = this.y + Math.abs(diffY) * Math.sin(angle) * value;

        if (!this.eatingTween.isActive()) {
          this.remove();
        }
      } else {
        this.remove();
      }
    }
  }

  remove() {
    super.remove();
    this.eatingTween?.destroy();
    this.game.gameState.removedEntities.delete(this);
  }
}

export default Coin;
