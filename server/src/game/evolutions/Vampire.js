const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Vampire extends Evolution {
  static type = Types.Evolution.Vampire;
  static level = 22;
  static previousEvol = Types.Evolution.Knight;
  // static level = 1;
  static abilityDuration = 4;
  static abilityCooldown = 75;

  applyAbilityEffects() {
    this.player.shape.setScale(0.75);
    this.player.modifiers.leech = 1.5;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.55;
    this.player.sword.damage.multiplier *= 1.5;
    this.player.sword.swingDuration.multiplier['ability'] = 2;
    this.player.health.max.multiplier *= 0.8;
  }

  update(dt) {
    this.player.modifiers.leech = 0.35;
    this.player.sword.damage.multiplier *= 0.9;
    this.player.health.max.multiplier *= 0.95;
    super.update(dt);
  }
}
