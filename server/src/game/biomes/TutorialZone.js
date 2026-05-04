const Safezone = require('./Safezone');
const Biome = require('./Biome');
const Types = require('../Types');

class TutorialZone extends Safezone {
  constructor(game, definition) {
    super(game, definition);
    this.type = Types.Biome.TutorialZone;
  }

  initialize(biomeData) {
    Biome.prototype.initialize.call(this, biomeData);
  }

  applyEffects(player) {
    player.viewport.zoom.multiplier *= 0.9;
    player.modifiers.safe = true;
  }

  collides() {}
}

module.exports = TutorialZone;
