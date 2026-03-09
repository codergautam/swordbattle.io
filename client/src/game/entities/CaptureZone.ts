import { BaseEntity } from './BaseEntity';

class CaptureZone extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];
  static removeTransition = 500;

  private borderContainer!: Phaser.GameObjects.Container;
  private labelText!: Phaser.GameObjects.Text;

  createSprite() {
    const radius = this.shape.radius;

    const zoneGraphics = this.game.add.graphics();
    zoneGraphics.fillStyle(0xf5c842, 0.15);
    zoneGraphics.fillCircle(0, 0, radius);
    zoneGraphics.fillStyle(0xffd700, 0.07);
    zoneGraphics.fillCircle(0, 0, radius * 0.7);

    const glowGraphics = this.game.add.graphics();
    for (let i = 3; i >= 0; i--) {
      const r = radius + i * 15;
      const a = 0.3 * (1 - i * 0.25);
      glowGraphics.lineStyle(6 - i, 0xffd700, a);
      glowGraphics.strokeCircle(0, 0, r);
    }

    const borderGraphics = this.game.add.graphics();
    borderGraphics.lineStyle(5, 0xf5c842, 0.85);
    const segments = 36;
    const dashRatio = 0.6;
    for (let i = 0; i < segments; i++) {
      const startAngle = (i / segments) * Math.PI * 2;
      const endAngle = startAngle + (dashRatio / segments) * Math.PI * 2;
      borderGraphics.beginPath();
      borderGraphics.arc(0, 0, radius, startAngle, endAngle, false);
      borderGraphics.strokePath();
    }
    borderGraphics.lineStyle(2, 0xffd700, 0.5);
    borderGraphics.strokeCircle(0, 0, radius * 0.95);

    this.borderContainer = this.game.add.container(0, 0, [borderGraphics]);

    this.labelText = this.game.add.text(0, -radius - 40, 'CAPTURE ZONE', {
      fontSize: `${Math.max(28, Math.round(radius / 20))}px`,
      fontFamily: 'Arial Black, Arial',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [
      zoneGraphics,
      glowGraphics,
      this.borderContainer,
      this.labelText,
    ]);

    return this.container;
  }

  update(dt: number) {
    super.update(dt);
    if (!this.container || this.removed) return;

    if (this.borderContainer) {
      this.borderContainer.rotation += dt * 0.15;
    }
  }

  remove() {
    super.remove();
  }
}

export default CaptureZone;
