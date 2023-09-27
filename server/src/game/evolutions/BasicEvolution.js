const Effect = require('../effects/Effect');

class BasicEvolution extends Effect {
  static type = 0;
  static biomes = [];
  static level = 10;

  constructor(player) {
    super(player, 'evolution');
  }

  update(dt) {
  }
}

module.exports = BasicEvolution;
