const Biome = require('./Biome');
const Types = require('../Types');

class EarthBiome extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.Earth, definition);
    this.zIndex = 2;
  }

  applyEffects(player) {
    player.speed.multiplier *= 0.9;
    player.sword.damage.multiplier *= 0.85;
  }
}

module.exports = EarthBiome;
