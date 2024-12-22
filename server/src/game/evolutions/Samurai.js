const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Samurai extends Evolution {
  static type = Types.Evolution.Samurai;
  static level = 22;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 8.5;
  static abilityCooldown = 55;

  applyAbilityEffects() {
    this.player.shape.setScale(1.1);
    this.player.sword.damage.multiplier *= 0.75;
    this.player.knockbackResistance.multiplier *= 100;
    this.player.health.regen.multiplier *= 4;
    this.player.speed.multiplier *= 1.2;


    this.player.health.regenWait.multiplier = 0;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.875;
    this.player.shape.setScale(1.05);
    this.player.sword.damage.multiplier *= 0.85;
    this.player.sword.knockback.multiplier['ability'] = 1.15;
    this.player.sword.swingDuration.multiplier['ability'] = 0.7;
    this.player.knockbackResistance.multiplier *= 2;
    this.player.health.max.multiplier *= 1.125;
    this.player.health.regen.multiplier *= 1.15;
    this.player.health.regenWait.multiplier *= 1;
    //TODO: Damagecooldown: 1.1
  }
}
