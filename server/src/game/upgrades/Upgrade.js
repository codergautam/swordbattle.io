const Types = require('../Types');

class Upgrade {
  static type = Types.Upgrade.None;
  static owner = Types.Evolution.Basic;
  static tier = 0;
  static label = '';

  constructor(player) {
    this.player = player;
  }

  update(dt) {}
  remove() {}
}

module.exports = Upgrade;
