const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Sniper extends Evolution {
  static type = Types.Evolution.Sniper;
  static level = 29;
  static previousEvol = Types.Evolution.Archer;
  static abilityDuration = 6.5;
  static abilityCooldown = 72;

  applyAbilityEffects() {
    this.player.viewport.zoom.multiplier *= 0.625;
    this.player.shape.setScale(1.1);
    this.player.speed.multiplier *= 1.125;

    
    this.player.modifiers.throwDamage = 5.25;
    this.player.sword.flySpeed.multiplier *= 1.65;
    this.player.sword.flyDuration.multiplier *= 1;

    this.player.health.regenWait.multiplier = 0;
    this.player.health.regen.multiplier *= 1;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(1.05);

    this.player.viewport.zoom.multiplier *= 0.725;
    this.player.modifiers.throwDamage = 4.25;
    this.player.speed.multiplier *= 0.975;
    
    this.player.health.regen.multiplier *= 0.7;
    this.player.health.regenWait.multiplier *= 1.3;

    this.player.sword.damage.multiplier *= 0.375;
    this.player.modifiers.chestPower = 2.5;
    this.player.modifiers.mobPower = 2.5;
    
    this.player.sword.knockback.multiplier['ability'] = 2.5;
    this.player.knockbackResistance.multiplier *= 0;

    this.player.sword.swingDuration.multiplier['ability'] = 0.875;

    this.player.sword.flyDuration.multiplier *= 1.5;
    this.player.sword.flySpeed.multiplier *= 1.55;
    this.player.sword.playerSpeedBoost.multiplier *= 2.35;
  }
}
