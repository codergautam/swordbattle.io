const Assassin = require('./Assassin');
const Types = require('../Types');
const { clamp } = require('../../helpers');

module.exports = class Reaper extends Assassin {
  static type = Types.Evolution.Reaper;
  static level = 42;
  static previousEvol = Types.Evolution.Assassin;
  static abilityDuration = 2.5;
  static abilityCooldown = 75;
  static executionRange = 2400;
  static executionDamageScale = 0.5;
  static executionMissingHealthScale = 0.2;
  static executionDamageCap = 1.5;
  static bonusHpPercent = 0.18;
  static bonusCapMultiplier = 1.15;

  constructor(player) {
    super(player);
    this.markedTarget = null;
    this.executionTarget = null;
  }

  isProtected(entity) {
    return !!(entity?.inSafezone || entity?.cards?.isTutorial || entity?.respawnShieldActive);
  }

  isValidMark(target, requireRange = false) {
    if (!target || target.removed || target.type !== Types.Entity.Player || target === this.player) return false;
    if (!target.health || target.health.isDead || target.depth !== this.player.depth) return false;
    if (this.isProtected(target) || this.isProtected(this.player)) return false;
    if (requireRange) {
      const dx = target.shape.x - this.player.shape.x;
      const dy = target.shape.y - this.player.shape.y;
      if (dx * dx + dy * dy > this.constructor.executionRange ** 2) return false;
    }
    return true;
  }

  clearMark() {
    this.markedTarget = null;
    this.executionTarget = null;
  }

  mark(target) {
    this.markedTarget = this.isValidMark(target) ? target : null;
  }

  pointIsProtected(x, y) {
    const map = this.player.game?.map;
    if (!map?.biomes) return false;
    const radius = this.player.shape.radius || 0;
    const samples = [[x, y]];
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      samples.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
    }
    return map.biomes.some(biome => {
      if (biome.type !== Types.Biome.Safezone && biome.type !== Types.Biome.TutorialZone) return false;
      return samples.some(([sx, sy]) => biome.shape?.isPointInside?.(sx, sy));
    });
  }

  findLanding(target) {
    const map = this.player.game?.map;
    if (!map) return null;
    const baseDistance = (target.shape.radius || 0) + (this.player.shape.radius || 0) + 55;
    const halfWidth = Number.isFinite(map.halfWidth) ? map.halfWidth : map.width / 2;
    const halfHeight = Number.isFinite(map.halfHeight) ? map.halfHeight : map.height / 2;
    const angles = [0, Math.PI / 8, -Math.PI / 8, Math.PI / 4, -Math.PI / 4];
    const distances = [baseDistance, baseDistance + 90, baseDistance + 180];
    for (const offset of angles) {
      const angle = target.angle + Math.PI + offset;
      for (const distance of distances) {
        const x = clamp(target.shape.x + Math.cos(angle) * distance, -halfWidth, halfWidth);
        const y = clamp(target.shape.y + Math.sin(angle) * distance, -halfHeight, halfHeight);
        if (!this.pointIsProtected(x, y)) return { x, y };
      }
    }
    return null;
  }

  activateAbility() {
    if (!this.canActivateAbility || this.isAbilityActive || this.player.sword?.isFlying) return;
    const target = this.markedTarget;
    if (!this.isValidMark(target, true)) {
      if (target && !this.isValidMark(target)) this.clearMark();
      return;
    }
    const landing = this.findLanding(target);
    if (!landing) return;

    super.activateAbility();
    if (!this.isAbilityActive) return;
    this.executionTarget = target;
    this.player.shape.x = landing.x;
    this.player.shape.y = landing.y;
    this.player.velocity.x = 0;
    this.player.velocity.y = 0;
    this.player.angle = Math.atan2(target.shape.y - landing.y, target.shape.x - landing.x);
    this.player.sword.collidedEntities.clear();
    this.player.sword.swingRequested = false;
    if (this.player.offhandSword) {
      this.player.offhandSword.collidedEntities.clear();
      this.player.offhandSword.swingRequested = false;
    }
  }

  deactivateAbility() {
    const wasActive = this.isAbilityActive;
    super.deactivateAbility();
    if (wasActive) this.clearMark();
  }

  onHit(target, isFlying, fairnessMult = 1) {
    const executionHit = this.isAbilityActive
      && target === this.executionTarget
      && target === this.markedTarget
      && !isFlying;

    if (target !== this.markedTarget) this.clearMark();
    if (target?.type === Types.Entity.Player && this.isValidMark(target)) this.mark(target);

    super.onHit(target, isFlying, fairnessMult);

    if (!executionHit) return;
    if (!target.health || target.removed || target.health.isDead) {
      this.deactivateAbility();
      return;
    }
    const maxHealth = target.health.max.value;
    const currentHealth = Math.max(0, target.health.percent) * maxHealth;
    const missingHealth = Math.max(0, maxHealth - currentHealth);
    const swordDamage = this.player.sword.damage.value;
    const raw = swordDamage * this.constructor.executionDamageScale
      + missingHealth * this.constructor.executionMissingHealthScale;
    const bonus = Math.min(raw, swordDamage * this.constructor.executionDamageCap) * fairnessMult;
    if (bonus > 0) target.damaged(bonus, this.player, false);
    this.deactivateAbility();
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.93 / 0.975);
    this.player.speed.multiplier *= 1.18 / 1.12;
    this.player.sword.damage.multiplier *= 1.55 / 1.36;
    this.player.health.max.multiplier *= 0.80 / 0.82;
    this.player.health.regen.multiplier *= 1.08 / 1.05;
    this.player.health.regenWait.multiplier *= 0.85 / 0.9;

    if (this.markedTarget && !this.isValidMark(this.markedTarget)) this.clearMark();
    if (this.markedTarget) this.markedTarget.flags.set(Types.Flags.ReaperMarked, this.player.id);
  }

  remove() {
    this.clearMark();
    super.remove();
  }
};
