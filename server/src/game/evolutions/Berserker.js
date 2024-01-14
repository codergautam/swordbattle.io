const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 10;
  static abilityDuration = 7;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.5;
     this.player.sword.swingDuration.multiplier['ability'] = 0.6;
  }

  update(dt) {
    super.update(dt);

    this.player.sword.damage.multiplier *= 1.25;
    this.player.knockbackResistance.multiplier *= 1.1;
  }
}
