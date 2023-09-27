const Biome = require('./Biome');
const Types = require('../Types');

class EarthBiome extends Biome {
  constructor(game, shape) {
    super(game, Types.Biome.Earth, shape);
  }
}

module.exports = EarthBiome;
