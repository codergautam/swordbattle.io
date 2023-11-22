const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Tank extends Evolution {
  static type = Types.Evolution.Tank;
  static level = 1;
  static abilityDuration = 10;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.speed.multiplier *= 1.2;
    this.player.sword.damage.multiplier *= 1.2;
    this.player.shape.setScale(2);
  }

  update(dt) {
    super.update(dt);

    this.player.speed.multiplier *= 0.8;
    this.player.shape.setScale(1.5);
    this.player.sword.damage.multiplier *= 2;
    this.player.sword.knockback.multiplier *= 2;
  }
}
