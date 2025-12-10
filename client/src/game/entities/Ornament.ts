import { BaseEntity } from './BaseEntity';

class Ornament extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'ornamentIndex'];
  private ornamentIndex: number = 0;

  createSprite() {
    // Use ornament1 or ornament2 based on ornamentIndex
    const textureName = this.ornamentIndex === 0 ? 'ornament1' : 'ornament2';
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, textureName);
    this.container.scale = (this.shape.radius * 2.5) / this.container.width;
    return this.container;
  }

  update(dt: number): void {
    super.update(dt);

    // Rotate the ornament sprite for visual effect (gentle spin)
    if (this.container) {
      this.container.rotation += dt / 100; // Slow gentle rotation
    }
  }

  processState(state: any): void {
    super.processState(state);
    if (state.ornamentIndex !== undefined) {
      this.ornamentIndex = state.ornamentIndex;
    }
  }
}

export default Ornament;
