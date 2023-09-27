const Effect = require('./Effect');

class BurningEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);

    this.multiplier = config.multiplier || 1.2;
    this.damage = config.damage || 1;
  }

  update(dt) {
    this.player.speed.multiplier *= this.multiplier;
    this.player.damage(this.damage * dt, 'Accidentally burned in lava');

    super.update(dt);
  }
}

module.exports = BurningEffect;
