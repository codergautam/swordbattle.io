const Player = require('./Player');
const Timer = require('../components/Timer');
const Types = require('../Types');
const helpers = require('../../helpers');

const Goal = {
  Wander: 0,
  Coins: 1,
  Ore: 2,
  Chest: 3,
  HuntBot: 4,
  Spar: 5,
  FightMob: 6,
  Flee: 7,
};

const goalDuration = {
  [Goal.Wander]: [3, 6],
  [Goal.Coins]: [8, 14],
  [Goal.Ore]: [12, 22],
  [Goal.Chest]: [12, 22],
  [Goal.HuntBot]: [9, 16],
  [Goal.Spar]: [6, 12],
  [Goal.FightMob]: [8, 15],
  [Goal.Flee]: [2, 4],
};

const hazardTypes = new Set([Types.Entity.LavaPool, Types.Entity.Cactus]);
const projectileTypes = new Set([
  Types.Entity.Fireball, Types.Entity.Boulder, Types.Entity.SwordProj,
  Types.Entity.Snowball, Types.Entity.SandBall, Types.Entity.SandBlock,
]);
const solidTypes = new Set([
  Types.Entity.Ore, Types.Entity.Rock, Types.Entity.LavaRock,
  Types.Entity.MossyRock, Types.Entity.IceSpike, Types.Entity.House1,
]);
const mobTypes = new Set(Types.Groups.Mobs);
const bossAlways = new Set([Types.Entity.Roku, Types.Entity.Ancient, Types.Entity.Sphinx]);

function posOf(entity) {
  const s = entity.shape;
  if (!s) return { x: 0, y: 0 };
  if (s.center && typeof s.center.x === 'number') return s.center;
  return { x: s.x, y: s.y };
}

function approxRadius(entity) {
  const s = entity.shape;
  if (!s) return 0;
  if (typeof s.radius === 'number') return s.radius;
  const b = s.boundary;
  if (b) return Math.max(b.width, b.height) / 2;
  return (entity.size || 0) / 2;
}

function projVel(p) {
  if (p.velocity && (Math.abs(p.velocity.x) > 0.01 || Math.abs(p.velocity.y) > 0.01)) {
    return { x: p.velocity.x, y: p.velocity.y };
  }
  const sp = p.speed && typeof p.speed.value === 'number'
    ? p.speed.value
    : (typeof p.speed === 'number' ? p.speed : 0);
  if (typeof p.angle === 'number' && sp) {
    return { x: Math.cos(p.angle) * sp, y: Math.sin(p.angle) * sp };
  }
  return { x: 0, y: 0 };
}

class PlayerAI extends Player {
  constructor(game, objectData) {
    super(game, objectData.name);

    this.isBot = true;
    this.coinShield = 0;

    this.smartness = Math.random();
    this.aggression = helpers.clamp(0.25 + this.smartness * 0.45 + Math.random() * 0.3, 0, 1);
    this.skill = this.computeSkill();

    this.goal = null;
    this.target = null;
    this.fleeFrom = null;

    this.attackCooldown = 0;
    this.throwCooldown = 0;
    this.fleeTimer = 0;
    this.sparDamageDealt = 0;

    this.movementDirection = helpers.random(-Math.PI, Math.PI);
    this.mouse = { angle: this.movementDirection, force: 0 };
    this.wanderAngle = helpers.random(-Math.PI, Math.PI);
    this.wanderTimer = new Timer(0, 2, 4);
    this.goalTimer = new Timer(0, 3, 6);
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = helpers.random(1.5, 3.5);
    this.weavePhase = Math.random() * Math.PI * 2;
    this.idle = false;

    this.aimError = 0;
    this.aimErrorTimer = 0;

    this.resourceHp = undefined;
    this.stuckTime = 0;
    this.lastEvolCount = 0;

    this._coins = [];
    this.chests = [];
    this.ores = [];
    this.hazards = [];
    this.solids = [];
    this.projectiles = [];
    this.bosses = [];
    this.mobs = [];
    this.threatMobs = [];
    this.bots = [];
    this.humans = [];

    this.game.map.shape.randomSpawnInside(this.shape);
    this.decideGoal();
  }

  computeSkill() {
    const coins = (this.levels && this.levels.coins) || 0;
    const coinFactor = helpers.clamp(coins / 8000, 0, 1);
    return helpers.clamp(0.18 + this.smartness * 0.5 + coinFactor * 0.4, 0, 0.97);
  }

  meleeReach() {
    const swordSize = (this.sword && this.sword.size) || 70;
    return this.shape.radius + swordSize * 2.6;
  }

  throwRange() {
    return 1300 + this.skill * 900;
  }

  awarenessRange() {
    return 200 + this.smartness * 300;
  }

  bossAvoidRange() {
    return 420 + this.smartness * 1500;
  }

  projReactRange() {
    return 340 + this.smartness * 380;
  }

  chestSkillMultiplier() {
    return 1.0 + this.skill * 0.7;
  }

  oreFocusChance() {
    return helpers.clamp(this.skill * 0.55, 0, 0.6);
  }

  isBossMobEntity(e) {
    return !!e && mobTypes.has(e.type) && (e.isGlobal || bossAlways.has(e.type));
  }

  isTargetInRealFight(target) {
    if (!target || !target.combatLog || target.type !== Types.Entity.Player) return false;
    for (const [fighterId, log] of target.combatLog) {
      if (fighterId === this.id) continue;
      const fighter = this.game.entities.get(fighterId);
      if (!fighter || fighter.removed || fighter.isBot) continue;
      if (fighter.type === Types.Entity.Player) {
        if (log.damageDealt > 5 || log.damageReceived > 5) {
          return true;
        }
      }
    }
    return false;
  }

  applyInputs(dt) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.goalTimer.update(dt);

    this.aimErrorTimer -= dt;
    if (this.aimErrorTimer <= 0) {
      this.aimErrorTimer = helpers.random(0.3, 0.6);
      this.aimError = (1 - this.skill) * helpers.random(-0.4, 0.4);
    }

    this.inputs.inputUp(Types.Input.SwordSwing);
    this.inputs.inputUp(Types.Input.SwordThrow);
    this.inputs.inputUp(Types.Input.Ability);

    this.perceive();
    this.skill = this.computeSkill();

    let forced = this.evaluateThreats(dt);
    if (!forced) forced = this.handleMobAggro();
    if (!forced && this.goal !== Goal.Flee && (this.goalTimer.finished || this.goal == null)) {
      this.decideGoal();
    }

    this.executeGoal(dt);
    this.checkUpgrades();

    super.applyInputs(dt);
  }

  perceive() {
    const ids = this.getEntitiesInViewport();
    this._coins.length = 0;
    this.chests.length = 0;
    this.ores.length = 0;
    this.hazards.length = 0;
    this.solids.length = 0;
    this.projectiles.length = 0;
    this.bosses.length = 0;
    this.mobs.length = 0;
    this.threatMobs.length = 0;
    this.bots.length = 0;
    this.humans.length = 0;

    for (let i = 0; i < ids.length; i++) {
      const e = this.game.entities.get(ids[i]);
      if (!e || e === this || e.removed || !e.shape) continue;
      const t = e.type;

      if (t === Types.Entity.Coin) {
        this._coins.push(e);
      } else if (t === Types.Entity.Chest) {
        this.chests.push(e);
      } else if (t === Types.Entity.Ore) {
        if (!e.isBoss) this.ores.push(e);
        this.solids.push(e);
      } else if (hazardTypes.has(t)) {
        this.hazards.push(e);
      } else if (projectileTypes.has(t)) {
        this.projectiles.push(e);
      } else if (solidTypes.has(t)) {
        this.solids.push(e);
      } else if (mobTypes.has(t)) {
        if (this.isBossMobEntity(e)) {
          this.bosses.push(e);
        } else {
          this.mobs.push(e);
          if (e.target === this) this.threatMobs.push(e);
        }
      } else if (t === Types.Entity.Player) {
        if (e.isBot) this.bots.push(e);
        else this.humans.push(e);
      }
    }
  }

  decideGoal() {
    const coins = (this.levels && this.levels.coins) || 0;
    const huntTarget = this.pickHuntTarget();
    const huntBias = this.aggression * (0.35 + Math.min(1, coins / 5000) * 0.55);

    if (huntTarget && Math.random() < huntBias) {
      this.setGoal(Goal.HuntBot, huntTarget);
      return;
    }

    const farmDesire = 1 - Math.min(1, coins / 6000) * 0.5;

    const options = [];
    const ore = this.nearest(this.ores);
    const chest = this.nearest(this.chests);
    const coin = this.nearest(this._coins);
    const mob = this.pickMobTarget();

    if (ore) options.push([Goal.Ore, ore, 3.0 * farmDesire]);
    if (chest) options.push([Goal.Chest, chest, 3.0 * farmDesire]);
    if (coin) options.push([Goal.Coins, coin, 2.2 * farmDesire + 0.4]);
    if (mob) options.push([Goal.FightMob, mob, 1.6 * this.skill * farmDesire]);
    if (huntTarget) options.push([Goal.HuntBot, huntTarget, huntBias * 2]);
    options.push([Goal.Wander, null, 0.8]);

    const pick = this.weightedChoice(options);
    this.setGoal(pick[0], pick[1]);
  }

  weightedChoice(options) {
    let total = 0;
    for (const o of options) total += Math.max(0, o[2]);
    if (total <= 0) return options[options.length - 1];
    let r = Math.random() * total;
    for (const o of options) {
      r -= Math.max(0, o[2]);
      if (r <= 0) return o;
    }
    return options[options.length - 1];
  }

  setGoal(goal, target = null) {
    this.goal = goal;
    this.target = target;
    this.resourceHp = undefined;
    this.stuckTime = 0;
    const dur = goalDuration[goal] || [6, 10];
    this.goalTimer.minTime = dur[0];
    this.goalTimer.maxTime = dur[1];
    this.goalTimer.renew();
    if (goal === Goal.Wander) this.idle = Math.random() < 0.22;
    if (goal === Goal.Spar) { this.sparDamageDealt = 0; this.sparTargetHp = undefined; }
  }

  setFlee(threat) {
    if (this.goal !== Goal.Flee || this.fleeFrom !== threat) {
      this.fleeTimer = helpers.random(1.2, 2.5);
    }
    this.goal = Goal.Flee;
    this.fleeFrom = threat;
  }

  abandonGoal() {
    this.target = null;
    this.resourceHp = undefined;
    this.decideGoal();
  }

  sweepOrDecide() {
    this.target = null;
    this.resourceHp = undefined;
    const coin = this.nearest(this._coins);
    if (coin) this.setGoal(Goal.Coins, coin);
    else this.decideGoal();
  }

  pickHuntTarget() {
    let best = null;
    let bestScore = -Infinity;
    const myCoins = (this.levels && this.levels.coins) || 0;
    for (const b of this.bots) {
      if (b.removed || !b.shape) continue;
      const bc = (b.levels && b.levels.coins) || 0;
      const ratio = bc / Math.max(1, myCoins);
      if (ratio > 3 && myCoins > 800 && this.aggression < 0.7) continue;
      const d = this.dist(b);
      if (d > 2600) continue;
      const score = (bc + 200) / (d + 400);
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  pickMobTarget() {
    let best = null;
    let bestScore = -Infinity;
    for (const m of this.mobs) {
      if (m.removed || !m.shape) continue;
      const d = this.dist(m);
      if (d > 1800) continue;
      const danger = (m.damage && typeof m.damage.value === 'number') ? m.damage.value : 5;
      const reward = m.coinsDrop || 200;
      const score = reward / (danger + 6) / (d + 400);
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  nearest(list) {
    let best = null;
    let bd = Infinity;
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e || e.removed || !e.shape) continue;
      const p = posOf(e);
      const dx = p.x - this.shape.x;
      const dy = p.y - this.shape.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  dist(entity) {
    const p = posOf(entity);
    return Math.hypot(p.x - this.shape.x, p.y - this.shape.y);
  }

  evaluateThreats() {
    for (const p of this.projectiles) {
      const px = p.shape.x, py = p.shape.y;
      const relx = this.shape.x - px, rely = this.shape.y - py;
      const d = Math.hypot(relx, rely);
      if (d > this.projReactRange() || d < 0.001) continue;
      const v = projVel(p);
      const vm = Math.hypot(v.x, v.y);
      if (vm < 0.01) continue;
      const closing = (v.x * relx + v.y * rely) / (vm * d);
      if (closing > 0.5) { this.setFlee(p); return true; }
    }
    let boss = null, bd = Infinity;
    for (const b of this.bosses) {
      const d = this.dist(b);
      if (d < this.bossAvoidRange() && d < bd) { bd = d; boss = b; }
    }
    if (boss) { this.setFlee(boss); return true; }
    return false;
  }

  handleMobAggro() {
    const m = this.nearest(this.threatMobs);
    if (!m) return false;
    if (this.isBossMobEntity(m) || this.health.percent < 0.32) {
      this.setFlee(m);
      return true;
    }
    if (this.goal !== Goal.FightMob || this.target !== m) {
      this.setGoal(Goal.FightMob, m);
    }
    return true;
  }

  executeGoal(dt) {
    switch (this.goal) {
      case Goal.Coins: this.executeCoins(dt); break;
      case Goal.Ore: this.executeOre(dt); break;
      case Goal.Chest: this.executeChest(dt); break;
      case Goal.HuntBot: this.executeHunt(dt); break;
      case Goal.Spar: this.executeSpar(dt); break;
      case Goal.FightMob: this.executeFightMob(dt); break;
      case Goal.Flee: this.executeFlee(dt); break;
      case Goal.Wander:
      default: this.executeWander(dt); break;
    }
  }

  executeWander(dt) {
    this.wanderTimer.update(dt);
    if (this.wanderTimer.finished) {
      this.wanderTimer.renew();
      this.wanderAngle += helpers.random(-Math.PI / 3, Math.PI / 3);
    }
    const s = this.computeSteering(this.wanderAngle, this.idle ? 0 : 85);
    this.mouse = { angle: s.angle, force: s.force };
    this.angle = helpers.angleLerp(this.angle, s.angle, helpers.clamp(dt / 0.3, 0, 1));
    if (s.force > 5) this.wanderAngle = helpers.angleLerp(this.wanderAngle, s.angle, 0.2);
  }

  executeCoins(dt) {
    let coin = this.target;
    if (!coin || coin.removed) coin = this.nearest(this._coins);
    if (!coin) { this.abandonGoal(); return; }
    this.target = coin;
    const p = posOf(coin);
    const a = Math.atan2(p.y - this.shape.y, p.x - this.shape.x);
    const s = this.computeSteering(a, 130);
    this.mouse = { angle: s.angle, force: s.force };
    this.angle = helpers.angleLerp(this.angle, s.angle, helpers.clamp(dt / 0.25, 0, 1));
  }

  executeOre(dt) {
    const ore = this.target;
    if (!ore || ore.removed) { this.sweepOrDecide(); return; }

    const c = posOf(ore);
    const dx = c.x - this.shape.x, dy = c.y - this.shape.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const toOre = Math.atan2(dy, dx);
    const reach = this.meleeReach();
    const oreR = approxRadius(ore);

    const standoff = oreR + this.shape.radius * 0.35 + Math.max(45, reach * 0.35);
    const inRange = dist < standoff + reach * 0.45;

    if (!this.trackResourceProgress(ore, dt, inRange)) return;

    this.updateStrafe(dt);
    let moveAngle, force;
    if (dist > standoff + 70) { moveAngle = toOre; force = 120; }
    else if (dist < standoff - 70) { moveAngle = toOre + Math.PI; force = 90; }
    else { moveAngle = toOre + this.strafeDir * (Math.PI / 2); force = 78; }

    const s = this.computeSteering(moveAngle, force, ore);
    this.mouse = { angle: s.angle, force: s.force };
    this.angle = helpers.angleLerp(this.angle, toOre, helpers.clamp(dt / 0.15, 0, 1));

    if (inRange) this.trySwing(toOre);
  }

  executeChest(dt) {
    const chest = this.target;
    if (!chest || chest.removed) { this.sweepOrDecide(); return; }

    const c = posOf(chest);
    const dx = c.x - this.shape.x, dy = c.y - this.shape.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const toChest = Math.atan2(dy, dx);
    const reach = this.meleeReach();
    const cr = approxRadius(chest);
    const inRange = dist < cr + reach * 0.7;

    if (!this.trackResourceProgress(chest, dt, inRange)) return;

    const force = dist > cr * 0.5 ? 105 : 12;
    const s = this.computeSteering(toChest, force);
    this.mouse = { angle: s.angle, force: s.force };
    this.angle = helpers.angleLerp(this.angle, toChest, helpers.clamp(dt / 0.15, 0, 1));

    if (inRange) this.trySwing(toChest);
  }

  executeHunt(dt) {
    const t = this.target;
    if (!t || t.removed) { this.sweepOrDecide(); return; }
    if (this.dist(t) > 3600) { this.abandonGoal(); return; }
    const foeSkill = (typeof t.skill === 'number') ? t.skill : 0.5;
    if (this.health.percent < 0.25 && foeSkill >= this.skill) { this.setFlee(t); return; }
    this.combatMove(t, dt, {});
  }

  executeFightMob(dt) {
    const m = this.target;
    if (!m || m.removed) { this.sweepOrDecide(); return; }
    if (this.health.percent < 0.3) { this.setFlee(m); return; }
    if (this.dist(m) > 2600) { this.abandonGoal(); return; }
    this.combatMove(m, dt, { mob: true });
  }

  executeSpar(dt) {
    const t = this.target;
    if (!t || t.removed) { this.abandonGoal(); return; }
    if (t.health) {
      if (this.sparTargetHp === undefined) this.sparTargetHp = t.health.percent;
      const dropped = this.sparTargetHp - t.health.percent;
      if (dropped > 0) this.sparDamageDealt += dropped * t.health.max.value;
      this.sparTargetHp = t.health.percent;
    }
    if (this.isTargetInRealFight(t)) { this.abandonGoal(); return; }
    if (t.health && t.health.percent < 0.2) { this.abandonGoal(); return; }
    if (t.health && this.sparDamageDealt > t.health.max.value * 0.45) { this.setFlee(t); return; }
    this.combatMove(t, dt, { spar: true });
  }

  executeFlee(dt) {
    const threat = this.fleeFrom;
    if (!threat || threat.removed) { this.abandonGoal(); return; }
    const tp = posOf(threat);
    const dx = this.shape.x - tp.x, dy = this.shape.y - tp.y;
    const d = Math.hypot(dx, dy) || 0.001;

    this.weavePhase += dt * 4;
    let away = Math.atan2(dy, dx) + Math.sin(this.weavePhase) * 0.35;

    const s = this.computeSteering(away, 145);
    this.mouse = { angle: s.angle, force: s.force };
    this.angle = helpers.angleLerp(this.angle, s.angle, helpers.clamp(dt / 0.18, 0, 1));

    if (threat.type === Types.Entity.Player && d < this.meleeReach() * 1.15 && this.skill > 0.45) {
      const back = Math.atan2(tp.y - this.shape.y, tp.x - this.shape.x);
      this.angle = helpers.angleLerp(this.angle, back, helpers.clamp(dt / 0.15, 0, 1));
      this.trySwing(back);
    }

    const safeDist = mobTypes.has(threat.type) ? 2200 : 1400;
    this.fleeTimer -= dt;
    if ((d > safeDist && this.health.percent > 0.55) || this.fleeTimer <= 0) {
      this.abandonGoal();
    }
  }

  trackResourceProgress(res, dt, inRange) {
    const hp = res.health ? res.health.percent : 1;
    if (this.resourceHp === undefined) this.resourceHp = hp;
    if (hp < this.resourceHp - 0.0005) {
      this.resourceHp = hp;
      this.stuckTime = 0;
      this.goalTimer.renew();
    } else if (inRange) {
      this.stuckTime += dt;
    }
    if (this.stuckTime > 8) {
      this.abandonGoal();
      return false;
    }
    return true;
  }

  combatMove(target, dt, opts) {
    const p = posOf(target);
    const dx = p.x - this.shape.x, dy = p.y - this.shape.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const toTarget = Math.atan2(dy, dx);
    const reach = this.meleeReach();

    const aim = this.aimAngle(target, false);
    const resp = Math.max(0.08, 0.22 - this.skill * 0.12);
    this.angle = helpers.angleLerp(this.angle, aim, helpers.clamp(dt / resp, 0, 1));

    let closing = 0;
    if (target.velocity) {
      closing = -((target.velocity.x * dx + target.velocity.y * dy) / dist);
    }

    const desired = reach * (opts.spar ? 0.85 : 0.8);
    const margin = reach * 0.18;
    this.updateStrafe(dt);

    let moveAngle, force;
    if (dist > desired + margin) {
      moveAngle = toTarget;
      force = 130;
    } else if (dist < desired - margin || closing > 40) {
      moveAngle = toTarget + Math.PI + this.strafeDir * 0.6;
      force = 110;
    } else {
      moveAngle = toTarget + this.strafeDir * (Math.PI / 2);
      force = 95;
    }

    const s = this.computeSteering(moveAngle, force);
    this.mouse = { angle: s.angle, force: s.force };

    this.tryCombatAttack(target, dist, toTarget, opts);
  }

  aimAngle(target, forThrow) {
    const p = posOf(target);
    let tx = p.x, ty = p.y;
    const md = target.movedDistance;
    if (md) {
      const dist = Math.hypot(p.x - this.shape.x, p.y - this.shape.y);
      const projPerSec = forThrow ? 1900 : 650;
      const t = Math.min(0.8, dist / projPerSec);
      tx += md.x * t * this.skill;
      ty += md.y * t * this.skill;
    }
    return Math.atan2(ty - this.shape.y, tx - this.shape.x) + this.aimError;
  }

  tryCombatAttack(target, dist, toTarget, opts) {
    const reach = this.meleeReach();
    const swordReady = this.sword.isAnimationFinished && !this.sword.isFlying;
    const diff = Math.abs(helpers.angleDifference(this.angle, toTarget));

    if (swordReady && this.attackCooldown <= 0 && dist <= reach * 1.12 && diff < 0.6) {
      this.inputs.inputDown(Types.Input.SwordSwing);
      this.attackCooldown = 0.1 + (1 - this.skill) * 0.4 + Math.random() * 0.05;
      return;
    }

    if (!opts.spar && !this.sword.isFlying && this.sword.flyCooldownTime <= 0 && this.throwCooldown <= 0) {
      const throwAim = this.aimAngle(target, true);
      const tdiff = Math.abs(helpers.angleDifference(this.angle, throwAim));
      const inBand = dist > reach * 1.3 && dist < this.throwRange();
      const aligned = tdiff < 0.26 + (1 - this.skill) * 0.12;
      if (inBand && aligned && Math.random() < 0.15 + this.skill * 0.5) {
        this.inputs.inputDown(Types.Input.SwordThrow);
        this.throwCooldown = 1.2;
        return;
      }
    }

    if (this.skill > 0.6 && this.evolutions && this.evolutions.evolutionEffect
      && this.evolutions.evolutionEffect.isAbilityAvailable && Math.random() < 0.02) {
      this.inputs.inputDown(Types.Input.Ability);
    }
  }

  trySwing(aimAngle) {
    if (this.attackCooldown > 0) return;
    if (!this.sword.isAnimationFinished || this.sword.isFlying) return;
    const diff = Math.abs(helpers.angleDifference(this.angle, aimAngle));
    if (diff > 0.75) return;
    this.inputs.inputDown(Types.Input.SwordSwing);
    this.attackCooldown = 0.12 + (1 - this.skill) * 0.35 + Math.random() * 0.05;
  }

  updateStrafe(dt) {
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = helpers.random(1.5, 3.5);
      this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    }
  }

  computeSteering(desiredAngle, desiredForce, skipSolid) {
    const px = this.shape.x, py = this.shape.y, myR = this.shape.radius;
    const react = this.awarenessRange();

    let sx = Math.cos(desiredAngle);
    let sy = Math.sin(desiredAngle);
    let rx = 0, ry = 0;

    for (const h of this.hazards) {
      const hp = posOf(h);
      const dx = px - hp.x, dy = py - hp.y;
      const d = Math.hypot(dx, dy);
      const zone = approxRadius(h) + myR + react;
      if (d < zone && d > 0.001) {
        const st = (zone - d) / zone;
        const w = st * st * 3.2;
        rx += (dx / d) * w; ry += (dy / d) * w;
      }
    }

    for (const proj of this.projectiles) {
      const dx = px - proj.shape.x, dy = py - proj.shape.y;
      const d = Math.hypot(dx, dy);
      const zone = approxRadius(proj) + myR + react * 0.8;
      if (d < zone && d > 0.001) {
        const st = (zone - d) / zone;
        const w = st * st * 3.5;
        rx += (dx / d) * w; ry += (dy / d) * w;
        const v = projVel(proj);
        const vm = Math.hypot(v.x, v.y);
        if (vm > 0.01) {
          let perpx = -v.y / vm, perpy = v.x / vm;
          if (perpx * dx + perpy * dy < 0) { perpx = -perpx; perpy = -perpy; }
          rx += perpx * w * 0.8; ry += perpy * w * 0.8;
        }
      }
    }

    for (const b of this.bosses) {
      const bp = posOf(b);
      const dx = px - bp.x, dy = py - bp.y;
      const d = Math.hypot(dx, dy);
      const zone = approxRadius(b) + myR + this.bossAvoidRange();
      if (d < zone && d > 0.001) {
        const st = (zone - d) / zone;
        const w = st * st * 2.8;
        rx += (dx / d) * w; ry += (dy / d) * w;
      }
    }

    for (const o of this.solids) {
      if (skipSolid && o === skipSolid) continue;
      const op = posOf(o);
      const dx = px - op.x, dy = py - op.y;
      const d = Math.hypot(dx, dy);
      const zone = approxRadius(o) + myR + 150;
      if (d < zone && d > 0.001) {
        const st = (zone - d) / zone;
        const w = st * st * 1.6;
        rx += (dx / d) * w * 0.6; ry += (dy / d) * w * 0.6;
        let perpx = -dy / d, perpy = dx / d;
        if (perpx * sx + perpy * sy < 0) { perpx = -perpx; perpy = -perpy; }
        rx += perpx * w; ry += perpy * w;
      }
    }

    const map = this.game.map;
    if (map && map.width && map.height) {
      const halfW = map.width / 2, halfH = map.height / 2;
      const edge = 800 + myR;
      const dL = px + halfW, dR = halfW - px, dT = py + halfH, dB = halfH - py;
      if (dL < edge) { const w = (edge - Math.max(0, dL)) / edge; rx += w * w * 3.0; }
      if (dR < edge) { const w = (edge - Math.max(0, dR)) / edge; rx -= w * w * 3.0; }
      if (dT < edge) { const w = (edge - Math.max(0, dT)) / edge; ry += w * w * 3.0; }
      if (dB < edge) { const w = (edge - Math.max(0, dB)) / edge; ry -= w * w * 3.0; }
    }

    const ax = sx + rx, ay = sy + ry;
    const mag = Math.hypot(ax, ay);
    if (mag < 0.0001) return { angle: desiredAngle, force: desiredForce };

    let force = desiredForce;
    const repMag = Math.hypot(rx, ry);
    if (repMag > 0.9) force = Math.max(force, helpers.clamp(repMag * 70, 70, 150));

    return { angle: Math.atan2(ay, ax), force };
  }

  checkUpgrades() {
    if (!this.evolutions) return;
    const n = this.evolutions.possibleEvols.size;
    if (n > 0 && n !== this.lastEvolCount) {
      this.lastEvolCount = n;
      const chance = 0.35 + this.smartness * 0.55
        + Math.min(0.25, ((this.levels && this.levels.coins) || 0) / 20000);
      if (Math.random() < chance) {
        const evol = helpers.randomChoice(Array.from(this.evolutions.possibleEvols));
        this.evolutions.upgrade(evol);
      }
    } else if (n === 0) {
      this.lastEvolCount = 0;
    }
  }

  damaged(damage, entity) {
    if (entity && !entity.removed && entity.shape) {
      if (entity.type === Types.Entity.Player && !entity.isBot) {
        if (this.goal === Goal.Flee) {
        } else if (this.health.percent < 0.3) {
          this.setFlee(entity);
        } else if (this.goal === Goal.Spar && this.target === entity) {
        } else if (!this.isTargetInRealFight(entity) && Math.random() < 0.85) {
          this.setGoal(Goal.Spar, entity);
        }
      } else if (entity.type === Types.Entity.Player && entity.isBot) {
        const myC = (this.levels && this.levels.coins) || 0;
        const oc = (entity.levels && entity.levels.coins) || 0;
        if (this.health.percent < 0.3 || (oc > myC * 2.2 && this.aggression < 0.6)) {
          this.setFlee(entity);
        } else if (this.goal !== Goal.HuntBot || this.target !== entity) {
          this.setGoal(Goal.HuntBot, entity);
        }
      } else if (mobTypes.has(entity.type)) {
        if (this.isBossMobEntity(entity) || this.health.percent < 0.35) {
          this.setFlee(entity);
        } else if (this.goal !== Goal.FightMob || this.target !== entity) {
          this.setGoal(Goal.FightMob, entity);
        }
      } else if (this.health.percent < 0.5) {
        this.setFlee(entity);
      }
    }

    super.damaged(damage, entity);
  }

  remove(reason) {
    super.remove(reason);
  }
}

module.exports = PlayerAI;
