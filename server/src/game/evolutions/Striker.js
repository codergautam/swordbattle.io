const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Striker extends Evolution {
  static type = Types.Evolution.Striker;
  static level = 1000; // Striker not in rotation
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 7.5;
  static abilityCooldown = 75;

  applyAbilityEffects() {
    this.player.modifiers.losslessChainDamage = true;
    this.player.sword.swingDuration.multiplier['ability'] = 0.85;
    this.player.health.regenWait.multiplier *= 0;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.losslessChainDamage = false;
    this.player.modifiers.chainDamage = true;
    this.player.speed.multiplier *= 1.1;
    this.player.shape.setScale(1.025);
    this.player.sword.damage.multiplier *= 0.975;

    this.player.health.max.multiplier *= 0.9;
    this.player.health.regen.multiplier *= 1.025;
    this.player.health.regenWait.multiplier *= 0.85;

    this.player.sword.swingDuration.multiplier['ability'] = 1.025;
  }
}
