const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Colossal extends Evolution {
  static type = Types.Evolution.Colossal;
  static level = 29;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 7;
  static abilityCooldown = 70;

  applyAbilityEffects() {
    this.player.sword.knockback.multiplier['ability'] = 3;
    this.player.knockbackResistance.multiplier *= 3;

    this.player.speed.multiplier *= 1.1;
    this.player.sword.damage.multiplier *= 1.1;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
    
    this.player.health.regen.multiplier *= 2;
    this.player.health.regenWait.multiplier *= 0;
  }

  update(dt) {
    super.update(dt);


    const hpPercent = this.player.health.percent;
    let sizeScale;
    if (this.isAbilityActive) {
      sizeScale = 1.3;
    } else {
      sizeScale = 1.1 + (1 - hpPercent) * 0.4;
    }
    this.player.shape.setScale(sizeScale);

    this.player.sword.damage.multiplier *= 1.1;

    this.player.sword.knockback.multiplier['ability'] = 0.75;
    this.player.knockbackResistance.multiplier *= 0;


    this.player.health.max.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 1.175;
    this.player.health.regenWait.multiplier *= 0.975;
  }
}
