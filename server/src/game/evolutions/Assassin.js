const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Assassin extends Evolution {
  static type = Types.Evolution.Assassin;
  static level = 24;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 5;
  static abilityCooldown = 80;
  static bonusHpPercent = 0.16;
  static bonusCapMultiplier = 1.0;

  onHit(target, isFlying, fairnessMult = 1) {
    if (isFlying) return;
    if (!target || target.type !== Types.Entity.Player) return;

    if (this.isAbilityActive) {
      const remaining = this.durationTime;
      if (remaining > 0.1) {
        target.addEffect(Types.Effect.Silenced, 'assassin_silence_' + this.player.id, { duration: remaining });
      }
    }

    const remainingHp = Math.max(0, target.health.percent) * target.health.max.value;
    const cap = this.player.sword.damage.value * this.constructor.bonusCapMultiplier;
    const bonus = Math.min(remainingHp * this.constructor.bonusHpPercent, cap) * fairnessMult;
    if (bonus > 0) {
      target.damaged(bonus, this.player);
    }
  }

  applyAbilityEffects() {
    this.player.speed.multiplier *= 1.1;
    this.player.sword.swingDuration.multiplier['ability'] = 0.9;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.975);
    this.player.speed.multiplier *= 1.12;
    this.player.sword.damage.multiplier *= 1.36;
    this.player.sword.knockback.multiplier['ability'] = 0.9;
    this.player.knockbackResistance.multiplier *= 0.95;
    this.player.health.max.multiplier *= 0.82;
    this.player.health.regen.multiplier *= 1.05;
    this.player.health.regenWait.multiplier *= 0.9;
  
  }
}
