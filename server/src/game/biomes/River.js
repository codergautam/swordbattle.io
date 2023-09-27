const Biome = require('./Biome');
const Types = require('../Types');

class River extends Biome {
  constructor(game, shape) {
    super(game, Types.Biome.River, shape);
  }
}

module.exports = River;
