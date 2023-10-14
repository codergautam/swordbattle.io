const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Tank extends Evolution {
  static type = Types.Evolution.Tank;
  static level = 1;

  update() {
    this.player.speed.multiplier *= 0.8;
    this.player.shape.setScale(1.5);
    this.player.sword.damage.multiplier *= 2;
    this.player.sword.knockback.multiplier *= 2;
  }
}
