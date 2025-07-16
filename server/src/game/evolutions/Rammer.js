const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Rammer extends Evolution {
  static type = Types.Evolution.Rammer;
  static level = 31;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman];
  static abilityDuration = 8;
  static abilityCooldown = 110;

  applyAbilityEffects() {
    this.player.modifiers.ramAbility = true;
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.knockback.multiplier['ability'] = 1.2;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.shape.setScale(1.175);
    this.player.health.regen.multiplier *= 0;
    this.player.speed.multiplier *= 0.6;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;

    this.player.sword.flyDuration.multiplier *= 0.2;
    this.player.sword.flySpeed.multiplier *= 2.5;
    this.player.health.max.multiplier *= 1;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.ramThrow = true;
    this.player.speed.multiplier *= 0.85;
    this.player.shape.setScale(1.12);
    this.player.sword.damage.multiplier *= 1.1;
    this.player.sword.knockback.multiplier['ability'] = 3;
    this.player.knockbackResistance.multiplier *= 1.4;
    this.player.health.max.multiplier *= 1.5;
    this.player.health.regen.multiplier *= 1.3;
    this.player.health.regenWait.multiplier *= 1.2;
    //TODO: Damagecooldown: 1.1
  }
}
