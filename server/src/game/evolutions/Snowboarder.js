const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Snowboarder extends Evolution {
  static type = Types.Evolution.Snowboarder;
  static level = 22;
  static previousEvol = Types.Evolution.SnowWalker;
  static abilityDuration = 4;
  static abilityCooldown = 75;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
  }

  onDamage(target) {
    // Only apply sliding knockback when ability is active
    if (!this.isAbilityActive) return;

    if (!target) return;
    if (target.type === Types.Entity.Player && !target.isBot) {
      // Apply sliding knockback effect - higher decay = longer slide
      target.addEffect(Types.Effect.SlidingKnockback, 'snowboarder_slide', {
        velocityDecayMultiplier: 0.95, // Much slower decay than normal 0.6
        duration: 1.5 // Slide for 1.5 seconds
      });
    }
  }

  applyAbilityEffects() {
    this.player.speed.multiplier *= 1.125;
    this.player.sword.damage.multiplier *= 1.2;

    this.player.sword.knockback.multiplier['ability'] = 0.2;
    this.player.sword.swingDuration.multiplier['ability'] = 0.725;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.speed.multiplier *= 0.9;
    this.player.sword.damage.multiplier *= 1.1;

    this.player.health.max.multiplier *= 1.1;
    this.player.health.regen.multiplier *= 0.8;
    this.player.health.regenWait.multiplier = 0.75;
    this.player.addEffect(Types.Effect.Slipping, 'slipping', { friction: 0.2, duration: 0.5 });
  }
}
