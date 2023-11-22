const Biome = require('./Biome');
const Types = require('../Types');

class FireBiome extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.Fire, definition);
    this.zIndex = 2;
  }

  applyEffects(player) {
    player.health.max.multiplier *= 0.9;
    player.sword.damage.multiplier *= 1.2;
  }
}

module.exports = FireBiome;
