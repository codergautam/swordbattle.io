const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 2;
  static previousEvol = Types.Evolution.Knight;
  static abilityDuration = 7;
  static abilityCooldown = 50;

  applyAbilityEffects() {

  }

  update(dt) {
    super.update(dt);

  }
}
