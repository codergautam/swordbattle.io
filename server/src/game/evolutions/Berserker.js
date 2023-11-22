const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 1;
  static abilityDuration = 10;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.2;
    this.player.shape.setScale(1.6);
  }

  update(dt) {
    super.update(dt);

    this.player.speed.multiplier *= 1.3;
    this.player.shape.setScale(1.3);
    this.player.sword.damage.multiplier *= 1.3;
    this.player.sword.knockback.multiplier *= 1.5;
  }
}
