const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class SuperArcher extends Evolution {
  static type = Types.Evolution.SuperArcher;
  static level = 29;
  static previousEvol = Types.Evolution.Archer;
  static abilityDuration = 0.2;
  static abilityCooldown = 4;

  applyAbilityEffects() {
    this.player.modifiers.cancelThrow = true;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.925);

    this.player.modifiers.scaleThrow = true;
    this.player.modifiers.throwDamage = 2.25;

    this.player.speed.multiplier *= 1.075;

    
    this.player.health.max.multiplier *= 0.85;
    this.player.health.regenWait.multiplier = 0.5;
    this.player.health.regen.multiplier *= 0.425;

    this.player.sword.damage.multiplier *= 0.35;
    
    this.player.sword.knockback.multiplier['ability'] = 1.5;
    this.player.knockbackResistance.multiplier *= 1.15;

    this.player.sword.swingDuration.multiplier['ability'] = 0.925;

    this.player.sword.flyDuration.multiplier *= 0.9;
    this.player.sword.flySpeed.multiplier *= 1.15;
    this.player.sword.playerSpeedBoost.multiplier *= 3;
  }
}
