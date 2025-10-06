const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Rammer extends Evolution {
  static type = Types.Evolution.Rammer;
  static level = 1000; // Rammer not in rotation
  static abilityDuration = 6;
  static abilityCooldown = 110;

  applyAbilityEffects() {
    this.player.modifiers.ramAbility = true;
    this.player.sword.knockback.multiplier['ability'] = 1.2;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.shape.setScale(1.175);
    this.player.health.regen.multiplier *= 0;
    this.player.speed.multiplier *= 0.6;
    this.player.sword.swingDuration.multiplier['ability'] = 0.65;

    this.player.sword.flyDuration.multiplier *= 0.5;
    this.player.sword.flySpeed.multiplier *= 1.75;
    this.player.health.max.multiplier *= 1;
    this.player.sword.damage.multiplier *= 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.ramThrow = true;
    this.player.speed.multiplier *= 0.825;
    this.player.shape.setScale(1.12);
    this.player.sword.damage.multiplier *= 0.7;
    this.player.sword.knockback.multiplier['ability'] = 3;
    this.player.knockbackResistance.multiplier *= 1.4;
    this.player.health.max.multiplier *= 1.5;
    this.player.health.regen.multiplier *= 1.3;
    this.player.health.regenWait.multiplier *= 1.2;

    this.player.sword.flyDuration.multiplier *= 0.4;
    this.player.sword.flySpeed.multiplier *= 0.8;
    //TODO: Damagecooldown: 1.1
  }
}
