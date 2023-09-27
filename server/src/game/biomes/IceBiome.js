const Biome = require('./Biome');
const Types = require('../Types');

class IceBiome extends Biome {
  constructor(game, shape) {
    super(game, Types.Biome.Ice, shape);
  }
}

module.exports = IceBiome;
