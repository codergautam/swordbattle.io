const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Vampire extends Evolution {
  static type = Types.Evolution.Vampire;
  static level = 13;
  static previousEvol = Types.Evolution.Knight;
  // static level = 1;
  static abilityDuration = 6;
  static abilityCooldown = 90;

  applyAbilityEffects() {
    this.player.modifiers.leech = 2;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.5;
  }

  update(dt) {
    this.player.modifiers.leech = 0.5;
    super.update(dt);
  }
}
