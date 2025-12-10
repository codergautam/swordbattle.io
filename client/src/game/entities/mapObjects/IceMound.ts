import { BaseEntity } from '../BaseEntity';

class IceMound extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];
  private isFaded = false;

  createSprite() {
    // If sprite already exists, don't create a duplicate
    if (this.container) {
      return this.container;
    }

    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'iceMound');
    this.container.scale = (this.shape.radius * 2 * 1.2) / this.container.width;
    return this.container;
  }

  // Override to prevent alpha tweens from interfering with texture transparency
  updateWorldDepth() {
    // Ice mounds are always visible (depth 0), no alpha modification needed
  }

  update(dt: number) {
    super.update(dt);

    if (!this.container) return;

    // Get the local player
    const localPlayer = this.game.gameState.self.entity;
    if (!localPlayer || !localPlayer.shape) return;

    // Calculate distance between ice mound and player
    const dx = this.shape.x - localPlayer.shape.x;
    const dy = this.shape.y - localPlayer.shape.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if player is colliding with ice mound (under it)
    const playerRadius = localPlayer.shape.radius || 0;
    const iceMoundRadius = this.shape.radius || 0;
    const isColliding = distance < (iceMoundRadius + playerRadius);

    // Switch texture based on collision state
    if (isColliding && !this.isFaded) {
      this.container.setTexture('iceMoundFaded');
      this.isFaded = true;
    } else if (!isColliding && this.isFaded) {
      this.container.setTexture('iceMound');
      this.isFaded = false;
    }
  }
}

export default IceMound;
