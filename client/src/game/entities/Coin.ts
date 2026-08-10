import { BaseEntity } from './BaseEntity';

class Coin extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];
  static pickupDuration = 220;

  hunter: any = null;
  displayRadius = 0.35;
  pickupElapsed = 0;
  pickupStarted = false;
  pickupStartX = 0;
  pickupStartY = 0;
  pickupStartScale = 1;

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'coin');
    this.container.scale = (this.shape.radius * 2 * this.displayRadius) / this.container.width;
    return this.container;
  }

  update(dt: number) {
    if (!this.removed) {
      super.update(dt);
      return;
    }

    const hunterContainer = this.hunter?.container;
    if (!hunterContainer || !this.container) {
      this.remove();
      return;
    }

    if (!this.pickupStarted) {
      this.pickupStarted = true;
      this.pickupStartX = this.container.x;
      this.pickupStartY = this.container.y;
      this.pickupStartScale = this.container.scale;
    }

    this.pickupElapsed += dt;
    const progress = Math.min(1, this.pickupElapsed / Coin.pickupDuration);
    const positionProgress = progress * progress;
    this.container.x = this.pickupStartX + (hunterContainer.x - this.pickupStartX) * positionProgress;
    this.container.y = this.pickupStartY + (hunterContainer.y - this.pickupStartY) * positionProgress;

    const scaleProgress = progress < 0.2
      ? 1 + progress * 0.4
      : 1.08 - (progress - 0.2) * 1.1;
    this.container.scale = this.pickupStartScale * Math.max(0.2, scaleProgress);
    this.container.alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    this.container.rotation += dt * 0.012;

    if (progress >= 1) this.remove();
  }

  remove() {
    this.game.gameState.removedEntities.delete(this);
    if (this.removed && !this.container) return;
    this.removed = true;
    const c = this.container;
    this.container = null;
    this.shape = (null as any);
    if (c) {
      try { (c as any).visible = false; } catch (e) {}
      BaseEntity.destroyQueue.push(() => {
        try { c.scene?.tweens?.killTweensOf(c); } catch (e) {}
        try { c.destroy(true); } catch (e) {}
      });
    }
  }
}

export default Coin;
