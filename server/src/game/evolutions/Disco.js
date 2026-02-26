const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Disco extends Evolution {
  static type = Types.Evolution.Disco;
  static level = 29;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 7;
  static abilityCooldown = 70;
  
  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.25;
    this.player.sword.knockback.multiplier['ability'] = 1.2;
    this.player.knockbackResistance.multiplier *= 2;
    this.player.shape.setScale(1.75);
    this.player.health.regen.multiplier *= 5;
    this.player.speed.multiplier *= 0.65;

    this.player.health.regenWait.multiplier = 0;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.speed.multiplier *= 0.775;
    this.player.shape.setScale(1.25);
    this.player.sword.damage.multiplier *= 1.185;
    this.player.sword.knockback.multiplier['ability'] = 1.35;
    this.player.knockbackResistance.multiplier *= 1.2;
    this.player.health.max.multiplier *= 1.3;
    this.player.health.regen.multiplier *= 1;
    this.player.health.regenWait.multiplier *= 0.8;
    //TODO: Damagecooldown: 1.1
  }
}
