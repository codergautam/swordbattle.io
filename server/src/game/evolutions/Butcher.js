const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Butcher extends Evolution {
  static type = Types.Evolution.Butcher;
  static level = 29;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 7;
  static abilityCooldown = 70;
  
  applyAbilityEffects() {
    this.player.health.max.multiplier *= 1.75;
    this.player.modifiers.leech = 0.8;
    this.player.sword.knockback.multiplier['ability'] = 1.2;
    this.player.knockbackResistance.multiplier *= 1.3;
    this.player.shape.setScale(1.05);
    this.player.speed.multiplier *= 1.05;

    this.player.health.regenWait.multiplier = 0;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.damageScale = true;

    // Slowly drain health during ability
    if (this.isAbilityActive) {
      const drainPerSecond = this.player.health.max.value * 0.1;
      this.player.health.damaged(drainPerSecond * dt);
      if (this.player.health.isDead) {
        this.player.remove("Butcher's Bloodcharge", Types.DisconnectReason.Mob);
      }
    }

    this.player.speed.multiplier *= 1.025;
    this.player.shape.setScale(1.025);
    this.player.sword.knockback.multiplier['ability'] = 1.2;
    this.player.health.max.multiplier *= 0.9;
    this.player.health.regen.multiplier *= 1.1;
    this.player.health.regenWait.multiplier *= 0.8;
  }
}
