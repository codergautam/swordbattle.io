const Biome = require('./Biome');
const Types = require('../Types');

class Safezone extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.Safezone, definition);
    this.coinsCollectLimit = 500;
    this.zIndex = 3;
  }

  perimeterPositions(count) {
    const out = [];
    if (this.shape.radius !== undefined) {
      const step = Math.PI * 2 / count;
      const cx = this.shape.x;
      const cy = this.shape.y;
      const r = this.shape.radius;
      for (let i = 0; i < count; i++) {
        out.push([cx + Math.cos(i * step) * r, cy + Math.sin(i * step) * r]);
      }
      return out;
    }
    const pts = this.shape.points;
    if (!pts || pts.length < 2) return out;

    let total = 0;
    const segLens = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segLens.push(len);
      total += len;
    }
    if (total === 0) return out;

    const spacing = total / count;
    let target = 0;
    let traveled = 0;
    for (let i = 0; i < pts.length && out.length < count; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = segLens[i];
      while (target <= traveled + len && out.length < count) {
        const t = (target - traveled) / len;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        out.push([this.shape.x + px, this.shape.y + py]);
        target += spacing;
      }
      traveled += len;
    }
    return out;
  }

  applyEffects(player) {
    if (player.levels.coins >= this.coinsCollectLimit) {
      this.game.map.shape.randomSpawnInside(player.shape);
    } else {
      player.viewport.zoom.multiplier *= 0.9;
      player.modifiers.safe = true;
    }
  }

  collides(player, response) {
    if (!player.inSafezone) {
      const mtv = this.shape.getCollisionOverlap(response);
      player.shape.applyCollision(mtv);
    }
  }
}

module.exports = Safezone;
