const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class IceSniper extends Evolution {
  static type = Types.Evolution.IceSniper;
  static level = 9999; // No winter evols now
  static previousEvol = Types.Evolution.SnowWalker;
  static abilityDuration = 6;
  static abilityCooldown = 90;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
  }

  onDamage(target, isFlying) {
    if (!isFlying) return;
    if (!target) return;
    if (target.type !== Types.Entity.Player || target.isBot) return;

    if (this.isAbilityActive) {
      target.addEffect(Types.Effect.SlidingKnockback, 'icesniper_slide', {
        velocityDecayMultiplier: 0.98,
        duration: 2,
      });
    } else {
      // Scale stun from 0.5s at close range to 2s at max range
      const flyLog = this.player.sword.flyLog || 0;
      const maxFlyDuration = this.player.sword.flyDuration.value;
      const progress = Math.min(1, flyLog / maxFlyDuration);
      const stunDuration = 0.5 + 1.5 * progress;

      target.addEffect(Types.Effect.Stun, 'icesniper_stun', { duration: stunDuration });
    }
  }

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 0.825;

    this.player.sword.knockback.multiplier['ability'] = 5;
    this.player.knockbackResistance.multiplier *= 2;
    
    this.player.viewport.zoom.multiplier *= 0.725;
    this.player.shape.setScale(1.2);
    this.player.speed.multiplier *= 0.85;

    this.player.sword.swingDuration.multiplier['ability'] = 0.8;
  }

  update(dt) {
    this.player.shape.setScale(0.975);
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.viewport.zoom.multiplier *= 0.9;
    this.player.modifiers.throwDamage = 2;
    this.player.speed.multiplier *= 0.95;
    
    this.player.health.regen.multiplier *= 0.8;
    this.player.health.regenWait.multiplier *= 1.3;

    this.player.sword.damage.multiplier *= 0.75;
    this.player.modifiers.chestPower = 1.5;
    this.player.modifiers.mobPower = 1.5;
    
    this.player.sword.knockback.multiplier['default'] = 2.5;
    this.player.knockbackResistance.multiplier *= 0;

    this.player.sword.swingDuration.multiplier['ability'] = 0.875;

    this.player.sword.flyDuration.multiplier *= 0.85;
    this.player.sword.flySpeed.multiplier *= 1.05;
  }
}
