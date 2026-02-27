const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Juggernaut extends Evolution {
  static type = Types.Evolution.Juggernaut;
  static level = 29;
  static previousEvol = "secret";
  static abilityDuration = 0;
  static abilityCooldown = 0;

  applyAbilityEffects() {
    // No ability for jugg
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 1.05;
    this.player.shape.setScale(1.1);
    this.player.sword.knockback.multiplier['ability'] = 1.25;
    this.player.knockbackResistance.multiplier *= 1.15;
    this.player.health.max.multiplier *= 1.15;
    this.player.health.regenWait.multiplier *= 0.9;
    this.player.sword.swingDuration.multiplier['ability'] = 0.95;

    // Old stats (for main evol reference)
    // super.update(dt);
    // this.player.speed.multiplier *= 1.125;
    // this.player.shape.setScale(1.125);
    // this.player.sword.damage.multiplier *= 1.15;
    // this.player.sword.knockback.multiplier['ability'] = 1.35;
    // this.player.knockbackResistance.multiplier *= 1.25;
    // this.player.health.max.multiplier *= 1.3;
    // this.player.health.regen.multiplier *= 1.2;
    // this.player.health.regenWait.multiplier *= 0.8;
    // this.player.sword.swingDuration.multiplier['ability'] = 0.8;
  }
}
