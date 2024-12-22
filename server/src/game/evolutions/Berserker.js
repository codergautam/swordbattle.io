const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Berserker extends Evolution {
  static type = Types.Evolution.Berserker;
  static level = 22;
  static previousEvol = Types.Evolution.Knight;
  static abilityDuration = 8;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.shape.setScale(0.95);
    this.player.sword.damage.multiplier *= 1.35;
    this.player.sword.knockback.multiplier['ability'] = 1.8;
    this.player.speed.multiplier *= 1.4;
     this.player.sword.swingDuration.multiplier['ability'] = 0.7;
     this.player.health.max.multiplier *= 0.75;
     this.player.health.regenWait.multiplier *= 2;
     this.player.health.regen.multiplier *= 2;
  }

  update(dt) {
    super.update(dt);
    this.player.sword.damage.multiplier *= 1.25;
    this.player.knockbackResistance.multiplier *= 1.1;
    this.player.speed.multiplier *= 1.1;
    this.player.health.max.multiplier *= 0.85;
    this.player.health.regenWait.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 1.2;
  }
}

