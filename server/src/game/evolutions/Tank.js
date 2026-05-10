const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Tank extends Evolution {
  static type = Types.Evolution.Tank;
  static level = 7;
  static abilityDuration = 6;
  static abilityCooldown = 150;
  static abilityScale = 1.5;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.1;
    this.player.sword.knockback.multiplier['ability'] = 1.2;
    this.player.knockbackResistance.multiplier *= 1.6;
    this.player.shape.setScale(1.5);
    this.player.health.regen.multiplier *= 4;
    this.player.speed.multiplier *= 0.65;

    this.player.health.regenWait.multiplier = 0;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.72;
    this.player.shape.setScale(1.15);
    this.player.sword.damage.multiplier *= 0.95;
    this.player.sword.knockback.multiplier['ability'] = 1.35;
    this.player.knockbackResistance.multiplier *= 1.1;
    this.player.health.max.multiplier *= 1.2;
    this.player.health.regen.multiplier *= 1;
    this.player.health.regenWait.multiplier *= 0.8;
    //TODO: Damagecooldown: 1.1
  }
}
