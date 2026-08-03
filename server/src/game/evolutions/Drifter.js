const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Drifter extends Evolution {
  static type = Types.Evolution.Drifter;
  static level = 9999; // No winter evols now
  static previousEvol = [Types.Evolution.Tree, Types.Evolution.Festive, Types.Evolution.Snowtrekker, Types.Evolution.IceSpike];
  static abilityDuration = 6;
  static abilityCooldown = 75;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
  }

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.2;

    this.player.sword.knockback.multiplier['ability'] = 0.8;

    this.player.health.regen.multiplier *= 3.5;
    this.player.health.regenWait.multiplier = 0;

    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.sword.swingDuration.multiplier['default'] = 0.85;

    const hpPercent = this.player.health.percent;
    let speedMultiplier;
    if (this.isAbilityActive) {
      speedMultiplier = 1.0 + hpPercent * 0.3;
    } else {
      speedMultiplier = 1.0 + (1 - hpPercent) * 0.3;
    }
    this.player.speed.multiplier *= speedMultiplier;
  }
}
