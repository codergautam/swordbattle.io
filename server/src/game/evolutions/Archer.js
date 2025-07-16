const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Archer extends Evolution {
  static type = Types.Evolution.Archer;
  static level = 26;
  static previousEvol = "secret";
  static abilityDuration = 6.5;
  static abilityCooldown = 72;

  applyAbilityEffects() {
    this.player.modifiers.invisible = true;
      this.player.shape.setScale(0.01);
      this.player.viewport.zoom.multiplier *= 0.01

    this.player.speed.multiplier *= 1.32;

    this.player.health.regenWait.multiplier = 0;
    this.player.health.regen.multiplier *= 1.5;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.9);

    this.player.modifiers.throwDamage = 3.5;

    this.player.speed.multiplier *= 1.2;

    
    this.player.health.max.multiplier *= 0.9;
    this.player.health.regen.multiplier *= 0.8;

    this.player.sword.damage.multiplier *= 0.4;
    
    this.player.sword.knockback.multiplier['ability'] = 2.5;
    this.player.knockbackResistance.multiplier *= 1.2;

    this.player.sword.swingDuration.multiplier['ability'] = 0.9;

    this.player.sword.flyDuration.multiplier *= 0.666;
    this.player.sword.flySpeed.multiplier *= 1.5;
    this.player.sword.playerSpeedBoost.multiplier *= 2.35;
  }
}
