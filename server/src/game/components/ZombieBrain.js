const Types = require('../Types');

const DECISION_INTERVAL = 0.2;
const AWARENESS = 2200;
const SOLIDS = new Set([
  Types.Entity.House1, Types.Entity.Rock, Types.Entity.MossyRock,
  Types.Entity.LavaRock, Types.Entity.IceSpike, Types.Entity.Ore,
  Types.Entity.Cactus,
]);
const PROJECTILES = new Set([
  Types.Entity.Sword, Types.Entity.ThrownSword, Types.Entity.Fireball,
  Types.Entity.Boulder, Types.Entity.SwordProj, Types.Entity.Snowball,
  Types.Entity.SandBall,
]);

function position(entity) {
  return entity?.shape?.center || entity?.shape || { x: 0, y: 0 };
}

function velocity(entity) {
  if (entity?.velocity) return entity.velocity;
  return { x: entity?.movedDistance?.x || 0, y: entity?.movedDistance?.y || 0 };
}

function distanceSquared(a, b) {
  const pa = position(a), pb = position(b);
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  return dx * dx + dy * dy;
}

class ZombieBrain {
  constructor(zombie) {
    this.zombie = zombie;
    this.target = null;
    this.retreating = false;
    this.strafeSign = 1;
    this.decisionClock = 0;
    this.throwCooldown = 0;
    this.attackCooldown = 0;
    this.moveAngle = 0;
    this.aimAngle = 0;
  }

  update(dt) {
    const z = this.zombie;
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.decisionClock += dt;

    const stagger = ((z.id || 0) % 5) * (DECISION_INTERVAL / 5);
    if (!this._staggered) {
      this._staggered = true;
      this.decisionClock = stagger;
    }
    if (this.decisionClock >= DECISION_INTERVAL) {
      this.decisionClock %= DECISION_INTERVAL;
      this.decide();
    }

    z.inputs.inputUp(Types.Input.SwordSwing);
    z.inputs.inputUp(Types.Input.SwordThrow);
    z.mouse = { angle: this.moveAngle, force: 150 };
    z.angle = this.aimAngle;

    if (!this.target || this.target.removed || this.target.inSafezone) return;
    const d2 = distanceSquared(z, this.target);
    const meleeReach = z.shape.radius + z.sword.size * 2.45;
    if (!this.retreating && d2 <= meleeReach * meleeReach && this.attackCooldown <= 0) {
      z.inputs.inputDown(Types.Input.SwordSwing);
      this.attackCooldown = z.variant === 3 ? 0.65 : 0.42;
    } else if (!this.retreating && d2 > 550 * 550 && d2 < 1850 * 1850 && this.throwCooldown <= 0) {
      z.inputs.inputDown(Types.Input.SwordThrow);
      this.throwCooldown = z.variant === 2 ? 3.2 : (z.variant === 3 ? 5.2 : 4.1);
    }
  }

  decide() {
    const z = this.zombie;
    if (z.health.percent < 0.25) this.retreating = true;
    else if (z.health.percent > 0.35) this.retreating = false;

    this.target = this.chooseTarget();
    if (!this.target) {
      this.moveAngle = ((z.id || 1) * 2.399963 + Date.now() / 9000) % (Math.PI * 2);
      this.aimAngle = this.moveAngle;
      return;
    }
    z.scaleToTarget(this.target);

    const zp = position(z), tp = position(this.target);
    const dx = tp.x - zp.x, dy = tp.y - zp.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const direct = Math.atan2(dy, dx);
    const targetVelocity = velocity(this.target);
    const leadTime = Math.min(0.65, dist / Math.max(1, z.sword.flySpeed.value));
    this.aimAngle = Math.atan2(
      tp.y + targetVelocity.y * leadTime - zp.y,
      tp.x + targetVelocity.x * leadTime - zp.x,
    );

    const dodge = this.projectileDodge();
    if (dodge !== null) {
      this.moveAngle = dodge;
      return;
    }

    if (this.retreating) {
      this.moveAngle = direct + Math.PI + this.spacingBias();
      return;
    }

    const ideal = z.variant === 2 ? 620 : (z.variant === 3 ? 480 : 390);
    const radial = dist > ideal + 130 ? 0 : (dist < ideal - 110 ? Math.PI : Math.PI / 2 * this.strafeSign);
    this.moveAngle = direct + radial + this.spacingBias();
    if (this.blockedAhead(this.moveAngle)) {
      this.strafeSign *= -1;
      this.moveAngle = direct + Math.PI / 2 * this.strafeSign;
    }
  }

  chooseTarget() {
    let best = null, bestDistance = Infinity;
    for (const player of this.zombie.game.players) {
      if (!player || player.removed || player.isBot || player.type !== Types.Entity.Player || player.inSafezone) continue;
      const d2 = distanceSquared(this.zombie, player);
      if (d2 < bestDistance) {
        bestDistance = d2;
        best = player;
      }
    }
    return best;
  }

  nearby(radius) {
    const p = position(this.zombie);
    const rect = { x: p.x - radius, y: p.y - radius, width: radius * 2, height: radius * 2 };
    return this.zombie.game.entitiesQuadtree?.get(rect) || [];
  }

  projectileDodge() {
    const z = this.zombie, zp = position(z);
    for (const item of this.nearby(800)) {
      const p = item.entity;
      if (!p || p.removed || !PROJECTILES.has(p.type) || p.player === z) continue;
      if (p.type === Types.Entity.Sword && !p.isFlying) continue;
      const pp = position(p), pv = velocity(p);
      const speed2 = pv.x * pv.x + pv.y * pv.y;
      if (speed2 < 1) continue;
      const rx = zp.x - pp.x, ry = zp.y - pp.y;
      const time = Math.max(0, Math.min(0.85, (rx * pv.x + ry * pv.y) / speed2));
      const miss = Math.hypot(pp.x + pv.x * time - zp.x, pp.y + pv.y * time - zp.y);
      if (time > 0.02 && miss < z.shape.radius + 135) {
        const projectileAngle = Math.atan2(pv.y, pv.x);
        return projectileAngle + Math.PI / 2 * this.strafeSign;
      }
    }
    return null;
  }

  spacingBias() {
    const z = this.zombie, zp = position(z);
    let sx = 0, sy = 0;
    for (const item of this.nearby(260)) {
      const other = item.entity;
      if (!other || other === z || other.type !== Types.Entity.Zombie) continue;
      const op = position(other), dx = zp.x - op.x, dy = zp.y - op.y;
      const d2 = Math.max(1, dx * dx + dy * dy);
      sx += dx / d2;
      sy += dy / d2;
    }
    return (sx || sy) ? Math.atan2(sy, sx) * 0.18 : 0;
  }

  blockedAhead(angle) {
    const z = this.zombie, zp = position(z);
    const aheadX = zp.x + Math.cos(angle) * 210;
    const aheadY = zp.y + Math.sin(angle) * 210;
    for (const item of this.nearby(320)) {
      const e = item.entity;
      if (!e || !SOLIDS.has(e.type) || !e.shape?.boundary) continue;
      const b = e.shape.boundary;
      if (aheadX >= b.x - z.shape.radius && aheadX <= b.x + b.width + z.shape.radius
        && aheadY >= b.y - z.shape.radius && aheadY <= b.y + b.height + z.shape.radius) return true;
    }
    return false;
  }
}

module.exports = ZombieBrain;
