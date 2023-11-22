import { random } from '../../helpers';
import { BaseEntity } from './BaseEntity';

class Sword extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'isFlying', 'abilityActive'];

  createSprite() {
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, 'sword')
      .setOrigin(-0.2, 0.5);
    return this.container;
  }

  addAbilityParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;

    const width = this.container.displayWidth;
    const height = this.container.displayHeight;
    const particles = this.game.add.particles(
      this.container.x - width * this.container.originX + random(-width, width) / 2,
      this.container.y - height * this.container.originY + random(-height, height) / 2,
      'starParticle',
      { scale: 0.05, speed: 200, maxParticles: 1 },
    );
    particles.setDepth(45);
  }

  update(dt: number) {
    super.update(dt);

    this.container.scale = (this.size * 3) / this.container.width;
    this.container.setVisible(this.isFlying);
    this.container.setRotation(this.shape.angle - Math.PI / 4);

    if (this.isFlying && this.abilityActive) {
      this.addAbilityParticles();
    }
  }
}

export default Sword;
