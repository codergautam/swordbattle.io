const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Knight extends Evolution {
  static type = Types.Evolution.Knight;
  static level = 14;
  static abilityDuration = 7;
  static abilityCooldown = 90;

  applyAbilityEffects() {
    this.player.shape.setScale(1);
    this.player.sword.damage.multiplier *= 1.15;
    this.player.sword.knockback.multiplier['ability'] = 1.4;
    this.player.speed.multiplier *= 1.2;
     this.player.sword.swingDuration.multiplier['ability'] = 0.75;
     this.player.knockbackResistance.multiplier *= 1.2;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.925);
    this.player.sword.damage.multiplier *= 1;
    this.player.knockbackResistance.multiplier *= 1.05;
    this.player.speed.multiplier *= 1.075;
    this.player.health.max.multiplier *= 0.9;
  }
}
