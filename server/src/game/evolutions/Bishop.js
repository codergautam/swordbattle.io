const Evolution = require('./BasicEvolution');
const BishopBolt = require('../entities/BishopBolt');
const Types = require('../Types');

const TARGET_TYPES = new Set([Types.Entity.Player, ...Types.Groups.Mobs]);
const BLOCKED_THROW_TYPES = new Set([Types.Entity.Sword, Types.Entity.ThrownSword, Types.Entity.SwordProj]);

module.exports = class Bishop extends Evolution {
  static type = Types.Evolution.Bishop;
  static level = 12;
  static previousEvol = Types.Evolution.Knight;
  static abilityDuration = 5;
  static abilityCooldown = 80;
  static chakramCount = 36;
  static chakramRadius = 245;
  static chakramBand = 58;
  static chakramHitCooldown = 0.45;
  static cannonRange = 2200;
  static cannonCooldown = 1.15;
  static cannonDamageScale = 0.45;
  static cannonSpeed = 1800;
  static cannonKnockback = 95;
  static chakramDamageScale = 0.32;

  constructor(player) {
    super(player);
    this.cannonCooldown = 0;
    this.elapsed = 0;
    this.chakramHits = new Map();
    this.lastTargetId = null;
  }

  isFriendly(entity) {
    return entity === this.player || (this.player.botTeamId !== null
      && this.player.botTeamId !== undefined
      && entity.botTeamId === this.player.botTeamId);
  }

  isValidTarget(entity) {
    return !!entity && !entity.removed && !!entity.shape
      && !entity.health?.isDead
      && TARGET_TYPES.has(entity.type) && !this.isFriendly(entity)
      && entity.depth === this.player.depth
      && !entity.inSafezone && !entity.cards?.isTutorial;
  }

  candidates(radius) {
    const { x, y } = this.player.shape;
    if (this.player.game.entitiesQuadtree) {
      return this.player.game.entitiesQuadtree.get({
        x: x - radius, y: y - radius, width: radius * 2, height: radius * 2,
      }).map(record => record.entity);
    }
    return Array.from(this.player.game.entities.values());
  }

  findNearestTarget() {
    const rangeSq = this.constructor.cannonRange ** 2;
    let best = null;
    let bestDistance = rangeSq;
    for (const entity of this.candidates(this.constructor.cannonRange)) {
      if (!this.isValidTarget(entity)) continue;
      const dx = entity.shape.x - this.player.shape.x;
      const dy = entity.shape.y - this.player.shape.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance || (distance === bestDistance && (!best || entity.id < best.id))) {
        best = entity;
        bestDistance = distance;
      }
    }
    return best;
  }

  fireCannon(target = this.findNearestTarget()) {
    if (!target || this.isAbilityActive || this.player.inSafezone) return null;
    const angle = Math.atan2(
      target.shape.y - this.player.shape.y,
      target.shape.x - this.player.shape.x,
    );
    const bolt = new BishopBolt(this.player.game, this.player, angle, {
      damage: Math.max(2, this.player.sword.damage.value * this.constructor.cannonDamageScale),
      speed: this.constructor.cannonSpeed,
      knockback: this.constructor.cannonKnockback,
    });
    if (!this.player.game.addEntity(bolt)) {
      bolt.removed = true;
      return null;
    }
    this.lastTargetId = target.id;
    return bolt;
  }

  activateAbility() {
    const wasReady = this.canActivateAbility && !this.isAbilityActive;
    super.activateAbility();
    if (wasReady && this.isAbilityActive) {
      this.elapsed = 0;
      this.chakramHits.clear();
    }
  }

  deactivateAbility() {
    super.deactivateAbility();
    this.chakramHits.clear();
    this.cannonCooldown = Math.min(this.cannonCooldown, 0.2);
  }

  applyAbilityEffects() {
    this.player.knockbackResistance.multiplier *= 1.2;
    this.player.health.regenWait.multiplier *= 0.5;
  }

  inChakramBand(entity) {
    const dx = entity.shape.x - this.player.shape.x;
    const dy = entity.shape.y - this.player.shape.y;
    const distance = Math.hypot(dx, dy);
    const entityRadius = entity.shape.radius || entity.size || 0;
    return Math.abs(distance - this.constructor.chakramRadius)
      <= this.constructor.chakramBand + entityRadius;
  }

  processChakramField() {
    const outer = this.constructor.chakramRadius + this.constructor.chakramBand + 150;
    for (const entity of this.candidates(outer)) {
      if (!entity || entity.removed || !entity.shape || entity === this.player) continue;
      if (!this.inChakramBand(entity)) continue;

      if (BLOCKED_THROW_TYPES.has(entity.type)) {
        const throwOwner = entity.player || entity.owner;
        if (throwOwner === this.player || this.isFriendly(throwOwner)) continue;
        if (entity.type === Types.Entity.Sword) {
          if (entity.isFlying && typeof entity.stopFly === 'function') entity.stopFly();
        } else if (typeof entity.remove === 'function') {
          entity.remove();
        }
        continue;
      }

      if (!this.isValidTarget(entity)) continue;
      const lastHit = this.chakramHits.get(entity.id) ?? -Infinity;
      if (this.elapsed - lastHit + Number.EPSILON < this.constructor.chakramHitCooldown) continue;
      this.chakramHits.set(entity.id, this.elapsed);
      entity.damaged(Math.max(2, this.player.sword.damage.value * this.constructor.chakramDamageScale), this.player, false);
    }
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt;

    this.player.shape.setScale(1.05);
    this.player.speed.multiplier *= 0.92;
    this.player.health.max.multiplier *= 1.12;
    this.player.knockbackResistance.multiplier *= 1.12;
    this.player.sword.damage.multiplier *= 0.9;

    if (this.isAbilityActive) {
      this.processChakramField();
      return;
    }

    if (this.player.modifiers.attackLocked) return;

    this.cannonCooldown -= dt;
    if (this.cannonCooldown <= 0) {
      const bolt = this.fireCannon();
      this.cannonCooldown = bolt ? this.constructor.cannonCooldown : 0;
    }
  }
};
