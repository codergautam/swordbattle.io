const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Defender extends Evolution {
  static type = Types.Evolution.Defender;
  static level = 18;
  static previousEvol = Types.Evolution.Rook;
  static abilityDuration = 7;
  static abilityCooldown = 180;
  static abilityScale = 1.7;

  applyAbilityEffects() {
    this.player.modifiers.noRestrictKnockback = true;

    this.player.sword.damage.multiplier *= 1.15;
    this.player.sword.knockback.multiplier['ability'] = 15;
    this.player.knockbackResistance.multiplier *= 1.6;
    this.player.shape.setScale(1.7);
    this.player.health.regen.multiplier *= 7.5;
    this.player.speed.multiplier *= 0.7;
1
    this.player.health.regenWait.multiplier = 0;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.8;
    this.player.shape.setScale(1.2);
    this.player.sword.damage.multiplier *= 0.7;
    this.player.sword.knockback.multiplier['ability'] = 1.5;
    this.player.knockbackResistance.multiplier *= 1.4;
    this.player.health.max.multiplier *= 1.5;
    this.player.health.regen.multiplier *= 1.35;
    this.player.health.regenWait.multiplier *= 0.75;
    //TODO: Damagecooldown: 1.1
  }
}
