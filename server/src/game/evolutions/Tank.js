const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Tank extends Evolution {
  static type = Types.Evolution.Tank;
  static level = 1;

  update() {
    this.player.speed.multiplier *= 1.5;
  }
}
