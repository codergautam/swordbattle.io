const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Knight extends Evolution {
  static type = Types.Evolution.Knight;
  static level = 14;
  static abilityDuration = 6;
  static abilityCooldown = 90;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.15;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.5;
     this.player.sword.swingDuration.multiplier['ability'] = 0.6;
  }

  update(dt) {
    super.update(dt);

    this.player.sword.damage.multiplier *= 1.1;
    // this.player.knockbackResistance.multiplier *= 1.05;
    this.player.speed.multiplier *= 1.05;
    this.player.health.max.multiplier *= 0.9;
  }
}
