import { BaseEntity } from '../BaseEntity';
import { BiomeTypes } from '../../Types';

class Bush extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];
  private isFaded = false;

  createSprite() {
    // If sprite already exists, don't create a duplicate
    if (this.container) {
      return this.container;
    }

    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'bush');
    this.container.scale = (this.shape.radius * 2 * 1.5) / this.container.width;
    return this.container;
  }

  // Override to prevent alpha tweens from interfering with texture transparency
  updateWorldDepth() {
    // Bushes are always visible (depth 0), no alpha modification needed
  }

  update(dt: number) {
    if (!this.container) return;

    super.update(dt);

    // Get the local player
    const localPlayer = this.game.gameState.self.entity;
    if (!localPlayer || !localPlayer.shape) return;

    // Don't fade bushes in safezone
    if (localPlayer.biome === BiomeTypes.Safezone) {
      // Reset to normal texture if currently faded
      if (this.isFaded) {
        this.container.setTexture('bush');
        this.isFaded = false;
      }
      return;
    }

    // Calculate distance between bush and player
    const dx = this.shape.x - localPlayer.shape.x;
    const dy = this.shape.y - localPlayer.shape.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if player is colliding with bush (under it)
    const playerRadius = localPlayer.shape.radius || 0;
    const bushRadius = this.shape.radius || 0;
    const isColliding = distance < (bushRadius + playerRadius);

    // Switch texture based on collision state
    if (isColliding && !this.isFaded) {
      this.container.setTexture('bushFaded');
      this.isFaded = true;
    } else if (!isColliding && this.isFaded) {
      this.container.setTexture('bush');
      this.isFaded = false;
    }
  }
}

export default Bush;
