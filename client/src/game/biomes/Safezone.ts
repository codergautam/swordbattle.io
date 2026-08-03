import Biome from './Biome';
import { ShapeTypes } from '../Types';

const platformOverhang = 420;

const shadowAlpha = 0.17;

class Safezone extends Biome {
  zIndex = -1;
  private platform: Phaser.GameObjects.Graphics | null = null;
  private shadow: any = null;

  createSprite() {
    const result = super.createSprite();
    this.drawPlatform();
    return result;
  }

  private drawPlatform() {
    this.destroyPlatform();
    const s: any = this.shape;
    if (!s) return;

    if (s.type === ShapeTypes.Circle || s.radius !== undefined) {
      const x = s.x;
      const y = s.y;
      const r = s.radius;

      const stairWidth = 380;
      const stepBounds = [r - 5, r + 55, r + 95, r + 135];
      const silhouetteHalfW = stairWidth / 2 + 8;
      const silhouetteOut = stepBounds[3] + 9;

      const shadowDrop = 55;
      const pad = 10;
      const half = silhouetteOut + pad;
      const res = 0.5;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(half * 2 * res);
      canvas.height = Math.ceil((half * 2 + shadowDrop) * res);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const drawSil = (offY: number, hw: number, uo: number) => {
          const pts = this.silhouettePoints(0, 0, r, hw, uo);
          ctx.beginPath();
          for (let i = 0; i < pts.length; i += 2) {
            const px = (pts[i] + half) * res;
            const py = (pts[i + 1] + offY + half) * res;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        };
        ctx.fillStyle = '#000000';
        drawSil(shadowDrop * 0.5, silhouetteHalfW, silhouetteOut);
        ctx.beginPath();
        ctx.arc(half * res, (half + 75) * res, r * 1.02 * res, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        drawSil(0, stairWidth / 2 + 2, stepBounds[3] + 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      const shadowKey = 'safezonePlatformShadow';
      const textures: any = this.scene.textures;
      if (textures.exists(shadowKey)) textures.remove(shadowKey);
      textures.addCanvas(shadowKey, canvas);
      const shadow = (this.scene.add as any).image(x - half, y - half, shadowKey)
        .setOrigin(0, 0)
        .setDepth(4.4)
        .setAlpha(shadowAlpha);
      shadow.setScale(1 / res);
      this.shadow = shadow;

      const g = this.scene.add.graphics();
      g.setDepth(4.5);

      const stepColors = [0x9a9a9a, 0x7b7b7b, 0x5f5f5f];
      for (let side = 0; side < 4; side++) {
        const mid = side * (Math.PI / 2);
        const rx = Math.cos(mid), ry = Math.sin(mid);
        const tx = -ry, ty = rx;
        const quad = (uA: number, uB: number) => [
          [x + rx * uA + tx * (stairWidth / 2), y + ry * uA + ty * (stairWidth / 2)],
          [x + rx * uB + tx * (stairWidth / 2), y + ry * uB + ty * (stairWidth / 2)],
          [x + rx * uB - tx * (stairWidth / 2), y + ry * uB - ty * (stairWidth / 2)],
          [x + rx * uA - tx * (stairWidth / 2), y + ry * uA - ty * (stairWidth / 2)],
        ];
        for (let i = 0; i < stepColors.length; i++) {
          const pts = quad(stepBounds[i], stepBounds[i + 1]);
          g.fillStyle(stepColors[i], 1);
          g.beginPath();
          g.moveTo(pts[0][0], pts[0][1]);
          for (let p = 1; p < 4; p++) g.lineTo(pts[p][0], pts[p][1]);
          g.closePath();
          g.fillPath();
          g.lineStyle(12, 0x000000, 1);
          g.strokePath();
        }
      }

      g.lineStyle(34, 0x000000, 1);
      g.strokeCircle(x, y, r);
      this.platform = g;
    } else if (s.points && s.points.length) {
      const g = this.scene.add.graphics();
      g.setDepth(4.5);
      g.lineStyle(34, 0x000000, 1);
      g.beginPath();
      g.moveTo(s.x + s.points[0].x, s.y + s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        g.lineTo(s.x + s.points[i].x, s.y + s.points[i].y);
      }
      g.closePath();
      g.strokePath();
      this.platform = g;
    }
  }

  private silhouettePoints(cx: number, cy: number, r: number, halfW: number, uOut: number): number[] {
    const pts: number[] = [];
    const beta = Math.asin(halfW / r);
    const uStar = Math.sqrt(r * r - halfW * halfW);
    const seg = 20;
    for (let i = 0; i < 4; i++) {
      const mid = i * (Math.PI / 2);
      const a0 = mid - Math.PI / 2 + beta;
      const a1 = mid - beta;
      for (let k = 0; k <= seg; k++) {
        const a = a0 + (a1 - a0) * (k / seg);
        pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      const rx = Math.cos(mid), ry = Math.sin(mid);
      const tx = -ry, ty = rx;
      pts.push(cx + rx * uOut - tx * halfW, cy + ry * uOut - ty * halfW);
      pts.push(cx + rx * uOut + tx * halfW, cy + ry * uOut + ty * halfW);
      pts.push(cx + rx * uStar + tx * halfW, cy + ry * uStar + ty * halfW);
    }
    return pts;
  }

  private platformVisible(): boolean {
    const s: any = this.shape;
    const camera = this.scene.cameras.main;
    if (s && s.radius !== undefined) {
      const wv = camera.worldView;
      const reach = s.radius + platformOverhang;
      return s.x + reach > wv.x && s.x - reach < wv.right
        && s.y + reach > wv.y && s.y - reach < wv.bottom;
    }
    return this.shape.isInViewport(camera);
  }

  update() {
    super.update();
    const visible = this.platformVisible();
    if (this.platform) this.platform.setVisible(visible);
    if (this.shadow) this.shadow.setVisible(visible);
  }

  private destroyPlatform() {
    if (this.platform) { this.platform.destroy(); this.platform = null; }
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
      const textures: any = this.scene.textures;
      try { if (textures.exists('safezonePlatformShadow')) textures.remove('safezonePlatformShadow'); } catch (e) { }
    }
  }

  destroy() {
    this.destroyPlatform();
    super.destroy();
  }
}

export default Safezone;
