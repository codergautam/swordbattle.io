const Effect = require('./Effect');

class RadarSlowEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);
    this.slowStart = config.slowStart !== undefined ? config.slowStart : 0.2;
  }

  update(dt) {
    const total = this.initialDuration || 0;
    const remaining = Math.max(0, this.duration || 0);
    const progress = total > 0 ? remaining / total : 0;
    const multiplier = 1 - (1 - this.slowStart) * progress;
    this.player.speed.multiplier *= multiplier;

    super.update(dt);
  }
}

module.exports = RadarSlowEffect;
