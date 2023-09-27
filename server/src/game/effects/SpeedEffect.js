const Effect = require('./Effect');

class SpeedEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);

    this.multiplier = config.multiplier || 1.2;
  }

  update(dt) {
    this.player.speed.multiplier *= this.multiplier;

    super.update(dt);
  }
}

module.exports = SpeedEffect;
