const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Sniper extends Evolution {
  static type = Types.Evolution.Sniper;
  static level = 29;
  static previousEvol = Types.Evolution.Archer;
  static abilityDuration = 6.5;
  static abilityCooldown = 72;

  applyAbilityEffects() {
    this.player.viewport.zoom.multiplier *= 0.575;
      this.player.shape.setScale(1.1);
    this.player.speed.multiplier *= 1.25;

    
    this.player.modifiers.throwDamage = 5;
    this.player.sword.flySpeed.multiplier *= 2.5;

    this.player.health.regenWait.multiplier = 0;
    this.player.health.regen.multiplier *= 2;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(1.05);

    this.player.viewport.zoom.multiplier *= 0.725;
    this.player.modifiers.throwDamage = 4;
    
    this.player.health.max.multiplier *= 1.1;
    this.player.health.regen.multiplier *= 0.7;
    this.player.health.regenWait.multiplier *= 0.8;

    this.player.sword.damage.multiplier *= 0.4;
    
    this.player.sword.knockback.multiplier['ability'] = 4;
    this.player.knockbackResistance.multiplier *= 0;

    this.player.sword.swingDuration.multiplier['ability'] = 0.875;

    this.player.sword.flyDuration.multiplier *= 1.5;
    this.player.sword.flySpeed.multiplier *= 2;
    this.player.sword.playerSpeedBoost.multiplier *= 2.35;
  }
}
