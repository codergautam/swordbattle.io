const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Slasher extends Evolution {
  static type = Types.Evolution.Slasher;
  static level = 1000; // Slasher not in rotation
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 7;
  static abilityCooldown = 70;

  applyAbilityEffects() {
    this.player.sword.knockback.multiplier['ability'] = 0.7;
    this.player.knockbackResistance.multiplier *= 1.1;

    this.player.speed.multiplier *= 1.1;
    this.player.sword.swingDuration.multiplier['ability'] = 0.75;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.swingWide = true;
    this.player.wideSwing = true;
    this.player.sword.swingAngle = -Math.PI / 1;

    this.player.speed.multiplier *= 1.1;
    this.player.shape.setScale(1.1);
    this.player.sword.damage.multiplier *= 1.225;

    this.player.sword.knockback.multiplier['ability'] = 0.8;
    this.player.knockbackResistance.multiplier *= 1.1;

    
    this.player.health.max.multiplier *= 1.125;
    this.player.health.regen.multiplier *= 1.125;
    this.player.health.regenWait.multiplier *= 1.15;
  }
}
