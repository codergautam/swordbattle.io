const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Defender extends Evolution {
  static type = Types.Evolution.Defender;
  static level = 27;
  static previousEvol = Types.Evolution.Rook;
  static abilityDuration = 7;
  static abilityCooldown = 100;

  applyAbilityEffects() {
    this.player.modifiers.noRestrictKnockback = true;

    this.player.sword.damage.multiplier *= 1.3;
    this.player.sword.knockback.multiplier['ability'] = 15;
    this.player.knockbackResistance.multiplier *= 2;
    this.player.shape.setScale(1.7);
    this.player.health.regen.multiplier *= 10;
    this.player.speed.multiplier *= 0.7;

    this.player.health.regenWait.multiplier = 0;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.8;
    this.player.shape.setScale(1.325);
    this.player.sword.damage.multiplier *= 0.8;
    this.player.sword.knockback.multiplier['ability'] = 2;
    this.player.knockbackResistance.multiplier *= 2;
    this.player.health.max.multiplier *= 2;
    this.player.health.regen.multiplier *= 1.5;
    this.player.health.regenWait.multiplier *= 0.75;
    //TODO: Damagecooldown: 1.1
  }
}
