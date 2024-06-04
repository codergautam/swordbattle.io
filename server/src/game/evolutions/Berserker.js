const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 22;
  static previousEvol = Types.Evolution.Knight;
  static abilityDuration = 8;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.15;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.5;
     this.player.sword.swingDuration.multiplier['ability'] = 0.6;
  }

  update(dt) {
    super.update(dt);
    this.player.sword.damage.multiplier *= 1.1;
    this.player.knockbackResistance.multiplier *= 1.05;
    this.player.speed.multiplier *= 1.1;
    this.player.health.max.multiplier *= 0.9;
  }
}

