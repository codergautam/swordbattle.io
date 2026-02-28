const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Disco extends Evolution {
  static type = Types.Evolution.Disco;
  static level = 29;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 7;
  static abilityCooldown = 80;
  static discoFieldRadius = 1250;
  static discoFieldDuration = 0.2;
  static hypnotizeRadius = 2000;

  constructor(player) {
    super(player);
    this.discoFieldTimer = 0;
    this.discoFieldDamage = 0;
    this.abilityElapsed = 0;
    this.hypnotizedPlayers = new Set();
  }

  onDamage(entity, isFlying) {
    this.discoFieldTimer = this.constructor.discoFieldDuration;
    this.discoFieldDamage = this.player.sword.damage.value * 2;
  }

  applyAbilityEffects() {
    this.player.speed.multiplier *= 0.95;
    this.player.health.regen.multiplier *= 0.75;
    this.player.sword.knockback.multiplier['ability'] = 0.8;
    this.player.sword.swingDuration.multiplier['ability'] = 0.875;
  }

  activateAbility() {
    super.activateAbility();
    this.abilityElapsed = 0;
  }

  deactivateAbility() {
    for (const entityId of this.hypnotizedPlayers) {
      const entity = this.player.game.entities.get(entityId);
      if (entity) {
        entity.hypnotizedBy = null;
      }
    }
    this.hypnotizedPlayers.clear();
    super.deactivateAbility();
  }

  update(dt) {
    super.update(dt);

    this.player.speed.multiplier *= 1.05;
    this.player.shape.setScale(1);
    this.player.sword.damage.multiplier *= 0.5;
    this.player.sword.knockback.multiplier['ability'] = 0.9;
    this.player.knockbackResistance.multiplier *= 0.9;
    this.player.health.max.multiplier *= 0.95;
    this.player.health.regen.multiplier *= 0.95;
    this.player.health.regenWait.multiplier *= 1.2;

    if (this.discoFieldTimer > 0) {
      this.discoFieldTimer -= dt;
      this.player.flags.set(Types.Flags.DiscoFieldActive, true);

      const radius = this.constructor.discoFieldRadius;
      const radiusSq = radius * radius;
      const dps = this.discoFieldDamage;

      for (const entity of this.player.game.entities.values()) {
        if (!entity || entity.removed) continue;
        if (!entity.shape) continue;
        if (entity === this.player) continue;

        const dx = entity.shape.x - this.player.shape.x;
        const dy = entity.shape.y - this.player.shape.y;
        if ((dx * dx + dy * dy) <= radiusSq) {
          try {
            const damage = dps * dt;
            if (typeof entity.damaged === 'function') {
              entity.damaged(damage, this.player);
            }
            if (entity.flags && typeof entity.flags.set === 'function') {
              entity.flags.set(Types.Flags.LavaDamaged, this.player.id || true);
            }
          } catch (e) {
            //
          }
        }
      }

      if (this.discoFieldTimer <= 0) {
        this.discoFieldTimer = 0;
      }
    }

    if (this.isAbilityActive) {
      this.abilityElapsed += dt;

      const growFactor = Math.min(1, this.abilityElapsed / 2);
      const effectiveRadius = this.constructor.hypnotizeRadius * growFactor;
      const effectiveRadiusSq = effectiveRadius * effectiveRadius;

      const currentlyHypnotized = new Set();

      for (const entity of this.player.game.entities.values()) {
        if (!entity || entity.removed) continue;
        if (entity.type !== Types.Entity.Player) continue;
        if (entity === this.player) continue;
        if (entity.isBot) continue;

        const dx = entity.shape.x - this.player.shape.x;
        const dy = entity.shape.y - this.player.shape.y;
        if ((dx * dx + dy * dy) <= effectiveRadiusSq) {
          entity.angle = Math.atan2(
            this.player.shape.y - entity.shape.y,
            this.player.shape.x - entity.shape.x
          );

          entity.hypnotizedBy = this.player;

          entity.flags.set(Types.Flags.Hypnotized, this.player.id);

          currentlyHypnotized.add(entity.id);
          this.hypnotizedPlayers.add(entity.id);
        }
      }

      for (const entityId of this.hypnotizedPlayers) {
        if (!currentlyHypnotized.has(entityId)) {
          const entity = this.player.game.entities.get(entityId);
          if (entity) {
            entity.hypnotizedBy = null;
          }
          this.hypnotizedPlayers.delete(entityId);
        }
      }
    } else {
      this.abilityElapsed = 0;
    }
  }

  remove() {
    for (const entityId of this.hypnotizedPlayers) {
      const entity = this.player.game.entities.get(entityId);
      if (entity) {
        entity.hypnotizedBy = null;
      }
    }
    this.hypnotizedPlayers.clear();
  }
}
