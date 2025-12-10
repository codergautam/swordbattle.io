const Effect = require('./Effect');

class SlidingKnockbackEffect extends Effect {
  constructor(player, id, config) {
    super(player, id, config);
    // velocityDecay controls how much velocity is retained each frame
    // Default 0.6 means 60% decay, higher value = longer slide
    this.velocityDecayMultiplier = config.velocityDecayMultiplier === undefined ? 0.95 : config.velocityDecayMultiplier;
  }

  update(dt) {
    // This effect will be checked in Player.js to modify velocity decay
    this.player.modifiers.slidingKnockback = this.velocityDecayMultiplier;

    super.update(dt);
  }
}

module.exports = SlidingKnockbackEffect;
