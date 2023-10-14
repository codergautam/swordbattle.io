const Biome = require('./Biome');
const Types = require('../Types');

class River extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.River, definition);
    this.zIndex = 1;
  }

  applyEffects(player) {
    player.speed.multiplier *= 1.4;
  }
}

module.exports = River;
