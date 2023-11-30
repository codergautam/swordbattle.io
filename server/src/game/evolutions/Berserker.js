const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 1;
  static abilityDuration = 10;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.6;
    this.player.sword.knockback.multiplier *= 1.8;
    this.player.speed.multiplier *= 1.6;
    this.player.knockbackResistance.multiplier *= 1.2;
    // TODO: this.player.swingTime.multiplier *= 0.5;
  }

  update(dt) {
    super.update(dt);

    this.player.sword.damage.multiplier *= 1.25;
    this.player.knockbackResistance.multiplier *= 1.1;
  }
}
