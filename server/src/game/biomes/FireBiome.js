const Biome = require('./Biome');
const Types = require('../Types');

class FireBiome extends Biome {
  constructor(game, shape) {
    super(game, Types.Biome.Fire, shape);
  }
}

module.exports = FireBiome;
