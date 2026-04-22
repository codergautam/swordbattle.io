import Biome from './Biome';
import { ShapeTypes } from '../Types';

class Safezone extends Biome {
  zIndex = -1;
  private outline: Phaser.GameObjects.Graphics | null = null;

  static createTexture(scene: Phaser.Scene) {
    const size = 64;
    const texture = scene.textures.createCanvas('safezone', size, size);
    const ctx = texture!.getContext();
    ctx.fillStyle = '#999999'; // Winter: 1d572e or 297941
    ctx.fillRect(0, 0, size, size);
    texture!.refresh();
  }

  createSprite() {
    const result = super.createSprite();
    this.drawOutline();
    return result;
  }

  private drawOutline() {
    if (this.outline) { this.outline.destroy(); this.outline = null; }
    const s: any = this.shape;
    if (!s) return;

    const g = this.scene.add.graphics();
    g.setDepth(0.6);

    const stroke = (lineWidth: number, color: number, alpha: number) => {
      g.lineStyle(lineWidth, color, alpha);
      if (s.type === ShapeTypes.Circle || s.radius !== undefined) {
        g.strokeCircle(s.x, s.y, s.radius);
      } else if (s.points && s.points.length) {
        g.beginPath();
        g.moveTo(s.x + s.points[0].x, s.y + s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          g.lineTo(s.x + s.points[i].x, s.y + s.points[i].y);
        }
        g.closePath();
        g.strokePath();
      }
    };

    stroke(34, 0x000000, 1);
    this.outline = g;
  }

  update() {
    super.update();
    if (this.outline) {
      this.outline.setVisible(this.shape.isInViewport(this.scene.cameras.main));
    }
  }

  destroy() {
    if (this.outline) { this.outline.destroy(); this.outline = null; }
    super.destroy();
  }
}

export default Safezone;
