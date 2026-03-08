import { BaseEntity } from './BaseEntity';

class CaptureZone extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields];
  static removeTransition = 500;

  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private borderGraphics!: Phaser.GameObjects.Graphics;
  private glowGraphics!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private elapsed = 0;
  private pulsePhase = 0;

  createSprite() {
    const radius = this.shape.radius;

    this.glowGraphics = this.game.add.graphics();
    this.drawGlow(radius, 0.3);

    this.zoneGraphics = this.game.add.graphics();
    this.zoneGraphics.fillStyle(0xf5c842, 0.18);
    this.zoneGraphics.fillCircle(0, 0, radius);
    this.zoneGraphics.fillStyle(0xffd700, 0.08);
    this.zoneGraphics.fillCircle(0, 0, radius * 0.7);

    this.borderGraphics = this.game.add.graphics();
    this.drawBorder(radius, 1);

    this.labelText = this.game.add.text(0, -radius - 40, 'CAPTURE ZONE', {
      fontSize: `${Math.max(28, Math.round(radius / 20))}px`,
      fontFamily: 'Arial Black, Arial',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    });
    this.labelText.setOrigin(0.5, 0.5);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [
      this.glowGraphics,
      this.zoneGraphics,
      this.borderGraphics,
      this.labelText,
    ]);

    return this.container;
  }

  private drawGlow(radius: number, alpha: number) {
    this.glowGraphics.clear();
    for (let i = 3; i >= 0; i--) {
      const r = radius + i * 15;
      const a = alpha * (1 - i * 0.25);
      this.glowGraphics.lineStyle(6 - i, 0xffd700, a);
      this.glowGraphics.strokeCircle(0, 0, r);
    }
  }

  private drawBorder(radius: number, alpha: number) {
    this.borderGraphics.clear();

    this.borderGraphics.lineStyle(5, 0xf5c842, alpha);
    const segments = 48;
    const dashRatio = 0.6;
    for (let i = 0; i < segments; i++) {
      const startAngle = (i / segments) * Math.PI * 2 + this.pulsePhase;
      const endAngle = startAngle + (dashRatio / segments) * Math.PI * 2;
      this.borderGraphics.beginPath();
      this.borderGraphics.arc(0, 0, radius, startAngle, endAngle, false);
      this.borderGraphics.strokePath();
    }

    this.borderGraphics.lineStyle(2, 0xffd700, alpha * 0.6);
    this.borderGraphics.strokeCircle(0, 0, radius * 0.95);

    this.borderGraphics.lineStyle(2, 0xf5c842, alpha * 0.35);
    for (let i = 0; i < segments; i++) {
      const startAngle = (i / segments) * Math.PI * 2 - this.pulsePhase * 0.5;
      const endAngle = startAngle + (dashRatio / segments) * Math.PI * 2;
      this.borderGraphics.beginPath();
      this.borderGraphics.arc(0, 0, radius * 0.88, startAngle, endAngle, false);
      this.borderGraphics.strokePath();
    }
  }

  update(dt: number) {
    super.update(dt);
    if (!this.container || this.removed) return;

    this.elapsed += dt;
    this.pulsePhase += dt * 0.25;

    const alpha = 0.7 + Math.sin(this.elapsed * 1.5) * 0.25;
    this.drawBorder(this.shape.radius, alpha);

    const glowAlpha = 0.25 + Math.sin(this.elapsed * 1.2 + 0.5) * 0.15;
    this.drawGlow(this.shape.radius, glowAlpha);

    if (this.zoneGraphics) {
      const fillAlpha = 0.15 + Math.sin(this.elapsed * 1.0) * 0.05;
      this.zoneGraphics.clear();
      this.zoneGraphics.fillStyle(0xf5c842, fillAlpha);
      this.zoneGraphics.fillCircle(0, 0, this.shape.radius);
      this.zoneGraphics.fillStyle(0xffd700, fillAlpha * 0.5);
      this.zoneGraphics.fillCircle(0, 0, this.shape.radius * 0.7);
    }

    if (this.labelText) {
      const labelAlpha = 0.8 + Math.sin(this.elapsed * 2) * 0.2;
      this.labelText.setAlpha(labelAlpha);
    }
  }

  remove() {
    super.remove();
  }
}

export default CaptureZone;
