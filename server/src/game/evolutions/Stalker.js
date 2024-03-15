const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Stalker extends Evolution {
  static type = Types.Evolution.Stalker;
  static level = 3;
  static previousEvol = Types.Evolution.Vampire;
  static abilityDuration = 6;
  static abilityCooldown = 90;

  applyAbilityEffects() {
  }

  update(dt) {
    super.update(dt);
  }
}
