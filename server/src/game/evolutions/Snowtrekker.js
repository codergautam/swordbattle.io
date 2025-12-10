const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Snowtrekker extends Evolution {
  static type = Types.Evolution.Snowtrekker;
  static level = 27;
  static previousEvol = Types.Evolution.Snowboarder;
  static abilityDuration = 0.01;
  static abilityCooldown = 30;
  static shockwaveRadius = 2000;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
  }

  activateAbility() {
    super.activateAbility();
    this.triggerShockwave();
  }

  triggerShockwave() {
    const radius = this.constructor.shockwaveRadius;
    const radiusSq = radius * radius;

    // Get base sword damage
    const baseDamage = this.player.sword.damage.value;

    for (const entity of this.player.game.entities.values()) {
      if (!entity || entity.removed) continue;
      if (!entity.shape) continue;
      if (entity === this.player) continue;
      if (entity.type !== Types.Entity.Player) continue;

      const dx = entity.shape.x - this.player.shape.x;
      const dy = entity.shape.y - this.player.shape.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        const dist = Math.sqrt(distSq);

        const distRatio = dist / radius;

        const damageMultiplier = 1.875 - (1.75 * distRatio);
        const damage = baseDamage * damageMultiplier;

        const knockbackPower = 1000 - (865 * distRatio);

        if (typeof entity.damaged === 'function') {
          entity.damaged(damage, this.player);
        }

        const direction = dist > 0 ? 1 / dist : 1;
        const knockbackResist = entity.knockbackResistance?.value || 1;
        entity.velocity.x += (dx * direction) * knockbackPower / knockbackResist;
        entity.velocity.y += (dy * direction) * knockbackPower / knockbackResist;

        if (entity.flags && typeof entity.flags.set === 'function') {
          entity.flags.set(Types.Flags.ShockwaveHit, this.player.id);
        }
      }
    }
  }

  applyAbilityEffects() {
    // Ability is instant
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.speed.multiplier *= 0.925;
    this.player.sword.damage.multiplier *= 1.1;

    this.player.health.max.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 0.9;
    this.player.health.regenWait.multiplier = 0.75;
    this.player.addEffect(Types.Effect.Slipping, 'slipping', { friction: 0.0001, duration: 4 });
  }
}
