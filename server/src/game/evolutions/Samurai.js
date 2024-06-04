const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Samurai extends Evolution {
  static type = Types.Evolution.Samurai;
  static level = 22;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 6;
  static abilityCooldown = 60;

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.5;
    this.player.sword.knockback.multiplier['ability'] = 2.5;
    this.player.knockbackResistance.multiplier *= 1.5;
    this.player.health.regen.multiplier *= 8;
    this.player.speed.multiplier *= 1.25;


    this.player.health.regenWait.multiplier = 0;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.85;
    this.player.shape.setScale(1.05);
    this.player.sword.damage.multiplier *= 1.15;
    this.player.sword.knockback.multiplier['ability'] = 1.15;
    this.player.knockbackResistance.multiplier *= 1.15;
    this.player.health.max.multiplier *= 1.15;
    this.player.health.regen.multiplier *= 1.15;
    this.player.health.regenWait.multiplier *= 1;
    //TODO: Damagecooldown: 1.1
  }
}
