const Types = require('../Types');
const helpers = require('../../helpers');
const { CircleEntity } = require('./BaseEntity');

class Coin extends CircleEntity {
  constructor(game) {
    super(game, Types.Entity.Coin);
    this.respawn();
    this.hunterId = null;
  }

  createState() {
    const state = super.createState();
    if (this.removed) {
      state.hunterId = this.hunterId;
    }
    return state;
  }

  respawn() {
    this.value = helpers.randomInteger(1, 6);
    this.radius = 15 + this.value * 2;
    this.x = helpers.random(this.radius, this.game.map.width - this.radius);
    this.y = helpers.random(this.radius, this.game.map.height - this.radius);
  }
}

module.exports = Coin;
