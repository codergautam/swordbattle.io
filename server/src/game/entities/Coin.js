const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Types = require('../Types');
const helpers = require('../../helpers');

class Coin extends Entity {
  constructor(game, objectData) {
    super(game, Types.Entity.Coin, objectData);

    this.value = helpers.randomInteger(1, 6);
    const radius = 22 + this.value * 2;

    this.shape = Circle.create(0, 0, radius);
    this.targets.push(Types.Entity.Player);
    this.hunterId = null;

    this.spawn();
  }

  createState() {
    const state = super.createState();
    if (this.removed) {
      state.hunterId = this.hunterId;
    }
    return state;
  }

  processTargetsCollision(player) {
    player.levels.addCoins(this.value);
    this.hunterId = player.id;

    if (this.respawnable) this.createInstance();
    this.remove();
  }
}

module.exports = Coin;
