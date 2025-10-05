const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Archer extends Evolution {
  static type = Types.Evolution.Archer;
  static level = 26;
  static previousEvol = "secret";
  static abilityDuration = 7;
  static abilityCooldown = 70;

  applyAbilityEffects() {
    this.player.speed.multiplier *= 1.4;
    this.player.shape.setScale(0.825)

    this.player.health.regenWait.multiplier = 0;
    this.player.health.max.multiplier *= 1.5;
    this.player.modifiers.throwDamage = 4.25;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.925);

    this.player.modifiers.throwDamage = 3.75;

    this.player.speed.multiplier *= 1.075;

    
    this.player.health.max.multiplier *= 0.9;
    this.player.health.regen.multiplier *= 1.25;
    this.player.health.regenWait.multiplier *= 0.8;

    this.player.sword.damage.multiplier *= 0.35;
    this.player.modifiers.chestPower = 3;
    this.player.modifiers.mobPower = 3;
    
    this.player.sword.knockback.multiplier['ability'] = 1.75;
    this.player.knockbackResistance.multiplier *= 1.2;

    this.player.sword.swingDuration.multiplier['ability'] = 0.9;

    this.player.sword.playerSpeedBoost.multiplier *= 2.35;
  }
}
