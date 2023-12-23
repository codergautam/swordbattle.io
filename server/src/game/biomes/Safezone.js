const Biome = require('./Biome');
const Types = require('../Types');

class Safezone extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.Safezone, definition);
    this.bushesCount = 50;
    this.coinsCollectLimit = 2000;
    this.zIndex = 3;
  }

  initialize(biomeData) {
    super.initialize(biomeData);

    const step = Math.PI * 2 / this.bushesCount;
    for (let i = 0; i < this.bushesCount; i++) {
      const angle = i * step;
      const size = 150 + Math.random() * 250;
      this.game.map.addEntity({
        type: Types.Entity.Bush,
        position: [
          Math.cos(angle) * this.shape.radius,
          Math.sin(angle) * this.shape.radius,
        ],
        size,
      });
    }
  }

  applyEffects(player) {
    if (player.levels.coins >= this.coinsCollectLimit) {
      this.game.map.shape.randomSpawnInside(player.shape);
    } else {
      player.viewport.zoom.multiplier *= 0.9;
      player.sword.damage.multiplier = 0;
      player.sword.knockback.multiplier['biome'] = 0;
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
