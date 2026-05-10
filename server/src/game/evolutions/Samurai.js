const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Samurai extends Evolution {
  static type = Types.Evolution.Samurai;
  static level = 12;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 4;
  static abilityCooldown = 150;

  applyAbilityEffects() {
    this.player.shape.setScale(1.1);
    this.player.sword.damage.multiplier *= 1.125;
    this.player.knockbackResistance.multiplier *= 1.55;
    this.player.health.regen.multiplier *= 2.5;
    this.player.speed.multiplier *= 1.15;
    this.player.sword.swingDuration.multiplier['ability'] = 0.65;
    this.player.sword.knockback.multiplier['ability'] = 1.5;

    this.player.health.regenWait.multiplier = 0;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.92;
    this.player.shape.setScale(1.0);
    this.player.sword.damage.multiplier *= 1.025;
    this.player.sword.knockback.multiplier['ability'] = 1.15;
    this.player.knockbackResistance.multiplier *= 1.15;
    this.player.health.max.multiplier *= 1.1;
    this.player.health.regen.multiplier *= 1.1;
    //TODO: Damagecooldown: 1.1
  }
}
