const Effect = require('./Effect');
const Types = require('../Types');

class BurningEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);

    this.multiplier = config.multiplier || 1.2;
    this.damage = config.damage || 1;
  }

  update(dt) {
    this.player.speed.multiplier *= this.multiplier;
    this.player.flags.set(Types.Flags.LavaDamaged, true);
    this.player.damaged(this.damage * dt, this.entity);

    super.update(dt);
  }
}

module.exports = BurningEffect;
