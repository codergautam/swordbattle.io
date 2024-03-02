const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Samurai extends Evolution {
  static type = Types.Evolution.Samurai;
  static level = 2;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 6;
  static abilityCooldown = 90;

  applyAbilityEffects() {
  }

  update(dt) {
    super.update(dt);
  }
}
