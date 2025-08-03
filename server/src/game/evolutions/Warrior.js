const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Warrior extends Evolution {
  static type = Types.Evolution.Warrior;
  static level = 27;
  static previousEvol = Types.Evolution.Samurai;
  static abilityDuration = 7;
  static abilityCooldown = 70;

  applyAbilityEffects() {
    this.player.shape.setScale(1.4);
    this.player.sword.damage.multiplier *= 1;
    this.player.sword.swingDuration.multiplier['ability'] = 0.65;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.health.regen.multiplier *= 1;
    this.player.speed.multiplier *= 1.3;
    this.player.sword.knockback.multiplier['ability'] = 1.5;

    this.player.health.regenWait.multiplier = 0;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.925;
    this.player.shape.setScale(1.15);
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.knockback.multiplier['ability'] = 1.15;
    this.player.health.max.multiplier *= 1.15;
    this.player.health.regen.multiplier *= 1.15;
    this.player.health.regenWait.multiplier *= 1.3;
    //TODO: Damagecooldown: 1.1
  }
}
