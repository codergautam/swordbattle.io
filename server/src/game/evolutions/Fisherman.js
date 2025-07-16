const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Fisherman extends Evolution {
  static type = Types.Evolution.Fisherman;
  static level = 27;
  static previousEvol = [Types.Evolution.Vampire, Types.Evolution.Berserker];
  // static level = 1;
  static abilityDuration = 6;
  static abilityCooldown = 66;

  applyAbilityEffects() {
    this.player.shape.setScale(1.25);
    this.player.speed.multiplier *= 1.4;
    this.player.modifiers.pullAll = true;
    this.player.modifiers.pullback = false;

    this.player.sword.knockback.multiplier['ability'] = 0.35;

    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.health.regen.multiplier *= 2.5;
    this.player.health.regenWait.multiplier *= 0;
    this.player.sword.damage.multiplier *= 0.8;
  }

  update(dt) {
    this.player.shape.setScale(1.025);
    this.player.modifiers.pullback = true;

    this.player.sword.knockback.multiplier['ability'] = 5;

    this.player.knockbackResistance.multiplier *= 1.35;
    this.player.sword.damage.multiplier *= 1.1;
    this.player.speed.multiplier *= 0.9;
    this.player.health.regenWait.multiplier *= 0.5;
    super.update(dt);
  }
}
