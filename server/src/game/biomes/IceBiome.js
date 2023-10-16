const Biome = require('./Biome');
const Types = require('../Types');

class IceBiome extends Biome {
  constructor(game, definition) {
    super(game, Types.Biome.Ice, definition);
    this.zIndex = 2;
  }

  applyEffects(player) {
    player.speed.multiplier *= 1.1;
    player.sword.swingDuration.multiplier *= 0.9;
    player.addEffect(Types.Effect.Slipping, 'iceBiome', { friction: 0.2, duration: 0.3 });
  }
}

module.exports = IceBiome;
