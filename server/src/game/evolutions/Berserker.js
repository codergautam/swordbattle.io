const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 1;

  update() {
    this.player.speed.multiplier *= 0.2;
  }
}
