const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Vampire extends Evolution {
  static type = Types.Evolution.Vampire;
  static level = 2;
  static previousEvol = Types.Evolution.Knight;
  static abilityDuration = 6;
  static abilityCooldown = 90;

  applyAbilityEffects() {
  }

  update(dt) {
    super.update(dt);
  }
}
