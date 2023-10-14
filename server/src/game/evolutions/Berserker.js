const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 1;

  update() {
    this.player.speed.multiplier *= 1.3;
    this.player.shape.setScale(1.3);
    this.player.sword.damage.multiplier *= 1.3;
    this.player.sword.knockback.multiplier *= 1.5;
  }
}
