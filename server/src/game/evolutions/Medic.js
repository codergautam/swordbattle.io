const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Medic extends Evolution {
  static type = Types.Evolution.Medic;
  static level = 29;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 0.01; // Instant ability
  static abilityCooldown = 70;

  activateAbility() {
    super.activateAbility();

    const healAmount = 0.333;
    this.player.health.gain(healAmount * this.player.health.max.value);
  }

  applyAbilityEffects() {
    // Ability is instant, no ongoing effects
  }

  update(dt) {
    super.update(dt);

    this.player.speed.multiplier *= 0.975;
    this.player.shape.setScale(0.975);
    this.player.sword.damage.multiplier *= 0.975;

    this.player.sword.knockback.multiplier['ability'] = 2;
    this.player.knockbackResistance.multiplier *= 0;

    
    this.player.health.max.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 0.75;
    this.player.health.regenWait.multiplier *= 0;
  }
}
