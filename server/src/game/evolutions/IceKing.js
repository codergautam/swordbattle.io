const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class IceKing extends Evolution {
  static type = Types.Evolution.IceKing;
  static level = 9999; // No winter evols now
  static previousEvol = [Types.Evolution.Tree, Types.Evolution.Festive, Types.Evolution.Snowtrekker, Types.Evolution.IceSpike];
  static abilityDuration = 8;
  static abilityCooldown = 90;
  static speedBoostDuration = 1500;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
    this.lastSpeedBoostHit = 0;
  }

  onDamage(target) {
    if (!target) return;
    if (target.type !== Types.Entity.Player || target.isBot) return;

    if (this.isAbilityActive) {
      this.lastSpeedBoostHit = Date.now();
    } else {
      target.addEffect(Types.Effect.Slow, 'iceking_slow', {
        slowMultiplier: 0.6,
        duration: 1.5
      });
    }
  }

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1.1;
    this.player.sword.knockback.multiplier['ability'] = 1.4;
    this.player.health.regen.multiplier *= 1.2;
    this.player.health.regenWait.multiplier = 0;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.speed.multiplier *= 1.05;
    this.player.sword.damage.multiplier *= 1.025;
    this.player.sword.knockback.multiplier['ability'] = 1.05;
    this.player.knockbackResistance.multiplier *= 0.95;
    this.player.health.max.multiplier *= 1.15;

    // Apply speed boost if we hit someone recently during ability
    const timeSinceHit = Date.now() - this.lastSpeedBoostHit;
    if (timeSinceHit < IceKing.speedBoostDuration) {
      this.player.speed.multiplier *= 1.35;
    }
  }
}
