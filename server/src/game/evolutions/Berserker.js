const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 12;
  static previousEvol = Types.Evolution.Knight;
  static abilityDuration = 12;
  static abilityCooldown = 105;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.5;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.25;
    this.player.sword.swingDuration.multiplier['ability'] = 0.65;
    this.player.health.regenWait.multiplier *= 1.3;
    this.player.health.regen.multiplier *= 0;
  }

  update(dt) {
    super.update(dt);
    this.player.sword.damage.multiplier *= 1.15;
    this.player.knockbackResistance.multiplier *= 1;
    this.player.speed.multiplier *= 1.1;
    this.player.health.max.multiplier *= 0.9;
    this.player.health.regenWait.multiplier *= 1.15;
    this.player.health.regen.multiplier *= 1.1;
  }
}

