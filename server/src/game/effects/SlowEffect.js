const Effect = require('./Effect');

class SlowEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);
    this.slowMultiplier = config.slowMultiplier || 0.75; // Default 25% slow
  }

  update(dt) {
    this.player.speed.multiplier *= this.slowMultiplier;

    super.update(dt);
  }
}

module.exports = SlowEffect;
