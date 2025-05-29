const Biome = require('./Biome');
const Types = require('../Types');

class DesertBiome extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.Desert, definition);
    this.zIndex = 2;
  }

  applyEffects(player) {
    player.speed.multiplier *= 0.9;
    player.sword.damage.multiplier *= 1.05;
  }
}

module.exports = DesertBiome;
