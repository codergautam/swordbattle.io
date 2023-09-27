const Effect = require('./Effect');

class SlippingEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);
    this.friction = config.friction === undefined ? 0.2 : config.friction;
  }

  update(dt) {
    this.player.friction.multiplier *= this.friction;

    super.update(dt);
  }
}

module.exports = SlippingEffect;
