import { BaseEntity } from './BaseEntity';

class Coin extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];

  hunter: any = null;
  eatingTween: Phaser.Tweens.Tween | null = null;
  displayRadius = 0.35;

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'coin');
    this.container.scale = (this.shape.radius * 2 * this.displayRadius) / this.container.width;
    return this.container;
  }

  private getOrCreateEatingTween(): Phaser.Tweens.Tween {
    if (!this.eatingTween) {
      this.eatingTween = this.game.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 200,
        repeat: 0,
      });
      this.eatingTween.pause();
    }
    return this.eatingTween;
  }

  update(dt: number) {
    super.update(dt);

    if (this.removed) {
      const { hunter } = this;
      if (hunter) {
        try {
        const tween = this.getOrCreateEatingTween();
        tween.resume();

        const diffX = hunter.container.x - this.container.x;
        const diffY = hunter.container.y - this.container.y;
        const angle = Math.atan2(diffY, diffX);
        const value = tween.getValue();
        this.container.x = this.container.x + Math.abs(diffX) * Math.cos(angle) * value;
        this.container.y = this.container.y + Math.abs(diffY) * Math.sin(angle) * value;

        if (!tween.isActive()) {
          this.remove();
        }
      } catch (e) {
        console.log(e);
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
