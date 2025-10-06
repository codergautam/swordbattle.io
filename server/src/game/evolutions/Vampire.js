const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Vampire extends Evolution {
  static type = Types.Evolution.Vampire;
  static level = 22;
  static previousEvol = Types.Evolution.Knight;
  // static level = 1;
  static abilityDuration = 6;
  static abilityCooldown = 85;

  applyAbilityEffects() {
    this.player.shape.setScale(0.925);
    this.player.modifiers.leech = 1.1;
    this.player.sword.knockback.multiplier['ability'] = 3;
    this.player.speed.multiplier *= 1.55;
    this.player.sword.damage.multiplier *= 1.5;
    this.player.sword.swingDuration.multiplier['ability'] = 1.55;
    this.player.health.max.multiplier *= 0.925;
  }

  update(dt) {
    this.player.modifiers.leech = 0.45;
    this.player.sword.damage.multiplier *= 0.9;
    this.player.health.max.multiplier *= 0.975;
    super.update(dt);
  }
}
