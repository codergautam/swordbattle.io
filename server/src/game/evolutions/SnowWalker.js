const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class SnowWalker extends Evolution {
  static type = Types.Evolution.SnowWalker;
  static level = 9999; // No winter evols now
  static abilityDuration = 4;
  static abilityCooldown = 75;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
    this.player.levels.tokens *= 2;
  }

  applyAbilityEffects() {
    this.player.speed.multiplier *= 0.65;
    this.player.sword.damage.multiplier *= 1.1;
    this.player.sword.knockback.multiplier['ability'] = 1.4;
    this.player.health.regen.multiplier *= 5;
    this.player.health.regenWait.multiplier = 0;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.speed.multiplier *= 1.025;
  }
}
