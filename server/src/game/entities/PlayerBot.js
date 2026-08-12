const Player = require('./Player');
const Timer = require('../components/Timer');
const Types = require('../Types');
const helpers = require('../../helpers');
const Dialogue = require('../ai/BotDialogue');
const { forGame: socialGraphForGame } = require('../ai/BotSocial');
const {
  BotPersonality,
  choosePersonality,
  filterEvolutionChoices,
} = require('../ai/BotPersonality');

const GENERAL_SENSE_INTERVAL = 0.2;
const PROJECTILE_SENSE_INTERVAL = 0.1;
const SOCIAL_INTERVAL = 1.5;
const GENERAL_SENSE_RANGE = 2800;

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

const richCoins = 6000;

const hazardTypes = new Set([Types.Entity.LavaPool, Types.Entity.Cactus]);
const projectileTypes = new Set([
  Types.Entity.Fireball, Types.Entity.Boulder, Types.Entity.SwordProj,
  Types.Entity.Snowball, Types.Entity.SandBall, Types.Entity.SandBlock,
  Types.Entity.ThrownSword,
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
  if (p.type === Types.Entity.Sword) {
    if (!p.isFlying) return { x: 0, y: 0 };
    if (p.boomerangReturning && p.boomerangOriginX !== undefined) {
      const dx = p.boomerangOriginX - p.shape.x;
      const dy = p.boomerangOriginY - p.shape.y;
      const mag = Math.hypot(dx, dy) || 1;
      const speed = p.flySpeed && p.flySpeed.value || 95;
      return { x: dx / mag * speed, y: dy / mag * speed };
    }
    const angle = p.boomerangOrigAngle || (p.shape.angle - Math.PI / 2);
    const speed = p.flySpeed && p.flySpeed.value || 95;
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  }
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
    this.personality = choosePersonality();
    this.runnerRoute = this.personality === BotPersonality.Runner
      ? (Math.random() < 0.7 ? 'archer' : 'berserker')
      : null;
    this.socialGraph = socialGraphForGame(game);

    this.smartness = Math.random();
    this.aggression = helpers.clamp(0.25 + this.smartness * 0.45 + Math.random() * 0.3, 0, 1);
    if (this.personality === BotPersonality.Spartan) {
      this.aggression = helpers.clamp(Math.max(0.68, this.aggression + 0.18), 0, 1);
    } else if (this.personality === BotPersonality.Runner) {
      this.aggression = helpers.clamp(this.aggression * 0.3, 0.05, 0.3);
    }
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
    this.moveAngle = this.movementDirection;
    this.wanderAngle = helpers.random(-Math.PI, Math.PI);
    this.wanderTimer = new Timer(0, 2, 4);
    this.goalTimer = new Timer(0, 3, 6);
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = helpers.random(1.5, 3.5);
    this.weavePhase = Math.random() * Math.PI * 2;
    this.idle = false;

    this.aimError = 0;
    this.aimErrorTarget = 0;
    this.aimErrorTimer = 0;

    this.inRangeTime = 0;
    this.outOfRangeTime = 0;
    this.huntLastDist = undefined;
    this.combatMode = 0;
    this.combatModeTime = 0;

    this.resourceHp = undefined;
    this.stuckTime = 0;
    this.lastEvolCount = 0;
    this.upgradeRetryTimer = 0;
    this.lastKills = 0;

    // Expensive world classification is staggered across bots. Projectile
    // sensing remains faster and queries a much smaller region.
    this.generalSenseTimer = Math.random() * GENERAL_SENSE_INTERVAL;
    this.projectileSenseTimer = Math.random() * PROJECTILE_SENSE_INTERVAL;
    this.socialTimer = helpers.random(0.5, SOCIAL_INTERVAL);
    this.speechCooldown = helpers.random(1, 5);
    this.pendingSpeech = null;
    this.projectileThreat = null;
    this.dodgeTimer = 0;
    this.dodgeAngle = 0;
    this.lowHealthSpoken = false;

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
    const coinFactor = helpers.clamp(coins / 10000, 0, 1);
    return helpers.clamp(0.15 + this.smartness * 0.45 + coinFactor * 0.3, 0.15, 0.85);
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
    this.upgradeRetryTimer = Math.max(0, this.upgradeRetryTimer - dt);
    this.goalTimer.update(dt);

    this.aimErrorTimer -= dt;
    if (this.aimErrorTimer <= 0) {
      this.aimErrorTimer = helpers.random(0.4, 0.9);
      this.aimErrorTarget = (1 - this.skill) * helpers.random(-0.3, 0.3);
    }
    this.aimError += (this.aimErrorTarget - this.aimError) * helpers.clamp(dt / 0.4, 0, 1);

    this.inputs.inputUp(Types.Input.SwordSwing);
    this.inputs.inputUp(Types.Input.SwordThrow);
    this.inputs.inputUp(Types.Input.Ability);

    this.tickSpeech(dt);
    this.generalSenseTimer -= dt;
    let decisionDue = false;
    if (this.generalSenseTimer <= 0) {
      this.generalSenseTimer += GENERAL_SENSE_INTERVAL;
      if (this.generalSenseTimer <= 0) this.generalSenseTimer = GENERAL_SENSE_INTERVAL;
      this.perceive();
      this.skill = this.computeSkill();
      decisionDue = true;
    }

    this.projectileSenseTimer -= dt;
    if (this.projectileSenseTimer <= 0) {
      this.projectileSenseTimer += PROJECTILE_SENSE_INTERVAL;
      if (this.projectileSenseTimer <= 0) this.projectileSenseTimer = PROJECTILE_SENSE_INTERVAL;
      this.scanProjectileThreats();
    }
    this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);

    if (decisionDue) {
      let forced = this.evaluateThreats();
      if (!forced) forced = this.handleMobAggro();
      if (!forced && this.goal !== Goal.Flee && (this.goalTimer.finished || this.goal == null)) {
        this.decideGoal();
      }
      this.checkUpgrades();
      this.checkCombatDialogue();
    }

    this.executeGoal(dt);
    if (this.dodgeTimer > 0) this.executeProjectileDodge(dt);

    this.socialTimer -= dt;
    if (this.socialTimer <= 0) {
      this.socialTimer = SOCIAL_INTERVAL + Math.random();
      this.socialize();
    }

    // Bot AI may only request normal swing/throw inputs. Evolution abilities
    // and boss-only projectile patterns stay human/server controlled.
    this.inputs.inputUp(Types.Input.Ability);

    const myCoins = (this.levels && this.levels.coins) || 0;
    this.coinMultiplier *= helpers.clamp(1 - myCoins / 6000, 0.15, 1);

    this.angle = Math.atan2(Math.sin(this.angle), Math.cos(this.angle));
    this.moveAngle = Math.atan2(Math.sin(this.moveAngle), Math.cos(this.moveAngle));
    this.wanderAngle = Math.atan2(Math.sin(this.wanderAngle), Math.cos(this.wanderAngle));

    super.applyInputs(dt);
  }

  perceive() {
    const entities = this.queryNearby(GENERAL_SENSE_RANGE);
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

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e || e === this || e.removed || !e.shape) continue;
      const t = e.type;

      if (t === Types.Entity.Coin) {
        this._coins.push(e);
      } else if (t === Types.Entity.Chest) {
        this.chests.push(e);
      } else if (t === Types.Entity.Ore) {
        if (!e.isBoss) this.ores.push(e);
        if (this.withinDistance(e, 950)) this.solids.push(e);
      } else if (hazardTypes.has(t)) {
        if (this.withinDistance(e, 1300)) this.hazards.push(e);
      } else if (this.isEnemyProjectile(e)) {
        if (this.withinDistance(e, 1300)) this.projectiles.push(e);
      } else if (solidTypes.has(t)) {
        if (this.withinDistance(e, 950)) this.solids.push(e);
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

  withinDistance(entity, distance) {
    const position = posOf(entity);
    const dx = position.x - this.shape.x;
    const dy = position.y - this.shape.y;
    return dx * dx + dy * dy <= distance * distance;
  }

  queryNearby(range) {
    const tree = this.game.entitiesQuadtree;
    if (!tree) return [];
    const area = {
      x: this.shape.x - range,
      y: this.shape.y - range,
      width: range * 2,
      height: range * 2,
    };
    const matches = tree.get(area);
    const entities = [];
    const maxDistanceSq = range * range;
    for (let i = 0; i < matches.length; i++) {
      const entity = matches[i].entity;
      if (!entity || entity.removed || !entity.shape) continue;
      const position = posOf(entity);
      const dx = position.x - this.shape.x;
      const dy = position.y - this.shape.y;
      if (dx * dx + dy * dy <= maxDistanceSq) entities.push(entity);
    }
    return entities;
  }

  isEnemyProjectile(entity) {
    if (!entity || entity.removed || !entity.shape) return false;
    if (entity.type === Types.Entity.Sword) {
      return entity.isFlying && entity.player !== this;
    }
    if (!projectileTypes.has(entity.type)) return false;
    const owner = entity.owner || entity.player;
    return owner !== this;
  }

  scanProjectileThreats() {
    const tree = this.game.entitiesQuadtree;
    if (!tree) return;
    const range = this.projReactRange() * 1.75;
    const area = {
      x: this.shape.x - range,
      y: this.shape.y - range,
      width: range * 2,
      height: range * 2,
    };
    const matches = tree.get(area);
    let best = null;
    let bestTime = Infinity;
    let bestVelocity = null;
    for (let i = 0; i < matches.length; i++) {
      const projectile = matches[i].entity;
      if (!this.isEnemyProjectile(projectile)) continue;
      const velocity = projVel(projectile);
      const speedSq = velocity.x * velocity.x + velocity.y * velocity.y;
      if (speedSq < 0.01) continue;
      const relx = this.shape.x - projectile.shape.x;
      const rely = this.shape.y - projectile.shape.y;
      const distanceSq = relx * relx + rely * rely;
      if (distanceSq > range * range) continue;
      const time = (relx * velocity.x + rely * velocity.y) / speedSq;
      if (time < 0 || time > 18) continue;
      const missX = relx - velocity.x * time;
      const missY = rely - velocity.y * time;
      const clearance = this.shape.radius + approxRadius(projectile) + 105;
      if (missX * missX + missY * missY > clearance * clearance) continue;
      if (time < bestTime) {
        best = projectile;
        bestTime = time;
        bestVelocity = velocity;
      }
    }

    this.projectileThreat = best;
    if (!best || !bestVelocity) return;
    const speed = Math.hypot(bestVelocity.x, bestVelocity.y) || 1;
    const nx = -bestVelocity.y / speed;
    const ny = bestVelocity.x / speed;
    const toBotX = this.shape.x - best.shape.x;
    const toBotY = this.shape.y - best.shape.y;
    const side = nx * toBotX + ny * toBotY >= 0 ? 1 : -1;
    this.dodgeAngle = Math.atan2(ny * side, nx * side);
    this.dodgeTimer = 0.34 + (1 - this.skill) * 0.12;
    this.strafeDir = side;
    if (Math.random() < 0.07) this.speak('dodge', best.player || best.owner);
  }

  executeProjectileDodge(dt) {
    const steering = this.computeSteering(this.dodgeAngle, 150);
    this.moveAngle = this.turnToward(this.moveAngle, steering.angle, dt, 13);
    this.mouse = { angle: this.moveAngle, force: 150 };
  }

  tickSpeech(dt) {
    this.speechCooldown = Math.max(0, this.speechCooldown - dt);
    if (!this.pendingSpeech) return;
    this.pendingSpeech.delay -= dt;
    if (this.pendingSpeech.delay <= 0) {
      const pending = this.pendingSpeech;
      this.pendingSpeech = null;
      this.speak(pending.situation, pending.target, true);
    }
  }

  speak(situation, target = null, force = false) {
    if (!force && this.speechCooldown > 0) return false;
    const name = target && target.name;
    this.addChatMessage(Dialogue.getLine(situation, { name }));
    this.speechCooldown = helpers.random(6, 12);
    return true;
  }

  queueSpeech(situation, target) {
    if (this.pendingSpeech || this.speechCooldown > 2) return;
    this.pendingSpeech = { situation, target, delay: helpers.random(0.55, 1.15) };
  }

  socialize() {
    if (this.speechCooldown > 0) return;
    let other = null;
    let bestDistanceSq = 1200 * 1200;
    for (const bot of this.bots) {
      if (!bot || bot.removed || this.socialGraph.relation(this, bot)) continue;
      const dx = bot.shape.x - this.shape.x;
      const dy = bot.shape.y - this.shape.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        other = bot;
      }
    }
    if (!other) return;
    const relation = this.socialGraph.chooseRelation(this, other);
    if (!this.socialGraph.setRelation(this, other, relation)) return;
    if (relation === 'team') {
      this.speak('teamOffer', other, true);
      other.queueSpeech('teamAccept', this);
    } else if (relation === 'rival') {
      this.speak('rivalry', other, true);
      other.queueSpeech('rivalry', this);
    } else {
      this.speak('neutral', other, true);
      other.queueSpeech('neutral', this);
    }
  }

  checkCombatDialogue() {
    if (this.kills > this.lastKills) {
      this.lastKills = this.kills;
      this.speak('victory', this.target);
    }
    if (this.health.percent < 0.28 && !this.lowHealthSpoken) {
      this.lowHealthSpoken = true;
      const situation = this.personality === BotPersonality.Spartan
        ? 'spartan'
        : (this.personality === BotPersonality.Runner ? 'runner' : 'lowHealth');
      this.speak(situation, this.target);
    } else if (this.health.percent > 0.6) {
      this.lowHealthSpoken = false;
    }
  }

  nearestRunnerThreat() {
    let best = null;
    let bestDistanceSq = 2300 * 2300;
    const groups = [this.humans, this.bots, this.mobs, this.bosses];
    for (const group of groups) {
      for (const entity of group) {
        if (!entity || entity.removed || !entity.shape) continue;
        const dx = entity.shape.x - this.shape.x;
        const dy = entity.shape.y - this.shape.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq;
          best = entity;
        }
      }
    }
    return best;
  }

  callForTeamHelp(attacker) {
    if (!attacker || attacker.removed) return;
    if (attacker.isBot && this.socialGraph.relation(this, attacker) === 'team') return;
    const members = this.socialGraph.teamMembers(this, this.game.players);
    for (const member of members) {
      if (member.personality === BotPersonality.Runner) continue;
      const dx = member.shape.x - this.shape.x;
      const dy = member.shape.y - this.shape.y;
      if (dx * dx + dy * dy > 2400 * 2400) continue;
      if (attacker.type === Types.Entity.Player) member.setGoal(Goal.HuntBot, attacker);
      else if (mobTypes.has(attacker.type)) member.setGoal(Goal.FightMob, attacker);
      member.queueSpeech('teamAssist', this);
    }
  }

  decideGoal() {
    const coins = (this.levels && this.levels.coins) || 0;

    if (this.personality === BotPersonality.Runner) {
      const threat = this.nearestRunnerThreat();
      if (threat) {
        this.setFlee(threat);
        return;
      }
    }

    let pileValue = 0;
    for (const c of this._coins) {
      if (c && !c.removed) pileValue += c.value || 1;
    }
    if (pileValue >= 2500) {
      this.setGoal(Goal.Coins, this.nearest(this._coins));
      return;
    }

    const rival = this.findRichRival();
    if (rival && Math.random() < 0.85) {
      this.setGoal(Goal.HuntBot, rival);
      this.goalTimer.minTime = 30;
      this.goalTimer.maxTime = 45;
      this.goalTimer.renew();
      return;
    }

    const huntTarget = this.pickHuntTarget();
    const huntBias = this.aggression * (0.35 + Math.min(1, coins / 5000) * 0.55);

    if (huntTarget && Math.random() < huntBias) {
      this.setGoal(Goal.HuntBot, huntTarget);
      return;
    }

    const farmDesire = helpers.clamp(1 - coins / 4000, 0.05, 1);

    const options = [];
    const ore = this.nearest(this.ores);
    const chest = this.nearest(this.chests);
    const coin = this.nearest(this._coins);
    const mob = this.pickMobTarget();

    if (ore) options.push([Goal.Ore, ore, 3.0 * farmDesire]);
    if (chest) options.push([Goal.Chest, chest, 3.0 * farmDesire]);
    if (coin) options.push([Goal.Coins, coin, 2.6 * farmDesire]);
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
    const wasCombat = this.goal === Goal.HuntBot || this.goal === Goal.Spar || this.goal === Goal.FightMob;
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
    if (goal === Goal.HuntBot || goal === Goal.Spar || goal === Goal.FightMob) {
      this.huntLastDist = undefined;
      if (!wasCombat) {
        this.inRangeTime = 0;
        this.outOfRangeTime = 0;
        this.combatMode = 0;
        this.combatModeTime = 0;
        this.attackCooldown = Math.max(this.attackCooldown,
          0.3 + (1 - this.skill) * 0.45 + Math.random() * 0.2);
      }
    }
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

  sweepOrDecide(fromCombat = false) {
    this.target = null;
    this.resourceHp = undefined;
    if (!fromCombat && this.isRich()) { this.decideGoal(); return; }
    const coin = this.nearest(this._coins);
    if (coin) this.setGoal(Goal.Coins, coin);
    else this.decideGoal();
  }

  pickHuntTarget() {
    let best = null;
    let bestScore = -Infinity;
    const myCoins = (this.levels && this.levels.coins) || 0;
    const candidates = this.bots.concat(this.humans);
    for (const b of candidates) {
      if (b.removed || !b.shape) continue;
      if (b.isBot && !this.socialGraph.canAttack(this, b)) continue;
      if (!b.isBot && this.isTargetInRealFight(b)) continue;
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

  isRich() {
    return (((this.levels && this.levels.coins) || 0) >= richCoins);
  }

  isRichDuel(t) {
    return this.isRich() && !!t && t.isBot === true && !t.removed
      && t.levels && t.levels.coins >= richCoins;
  }

  findRichRival() {
    if (!this.isRich()) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const p of this.game.players) {
      if (p === this || p.removed || !p.isBot || !p.levels) continue;
      if (!this.socialGraph.canAttack(this, p)) continue;
      if (p.levels.coins < richCoins) continue;
      const d = this.dist(p);
      const score = p.levels.coins / (d + 1500);
      if (score > bestScore) { bestScore = score; best = p; }
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

  turnToward(current, target, dt, rate) {
    const diff = helpers.angleDifference(current, target);
    const step = rate * dt;
    if (Math.abs(diff) <= step) return current + diff;
    return current + Math.sign(diff) * step;
  }

  steerMove(desiredAngle, desiredForce, dt, baseRate, skipSolid) {
    const s = this.computeSteering(desiredAngle, desiredForce, skipSolid);
    const rate = baseRate * (1 + Math.min(1.5, s.urgency || 0));
    this.moveAngle = this.turnToward(this.moveAngle, s.angle, dt, rate);
    this.mouse = { angle: this.moveAngle, force: s.force };
    return s;
  }

  evaluateThreats() {
    let boss = null, bd = Infinity;
    const duelFocused = this.goal === Goal.HuntBot && this.isRichDuel(this.target);
    const avoid = this.bossAvoidRange() * (duelFocused ? 0.35 : 1);
    for (const b of this.bosses) {
      const d = this.dist(b);
      if (d < avoid && d < bd) { bd = d; boss = b; }
    }
    if (boss) { this.setFlee(boss); return true; }
    return false;
  }

  handleMobAggro() {
    let m = this.nearest(this.threatMobs);
    if (!m) return false;
    if (this.goal === Goal.FightMob && this.target && !this.target.removed
      && m !== this.target && this.threatMobs.includes(this.target)
      && this.dist(m) > this.dist(this.target) * 0.75) {
      m = this.target;
    }
    const retreatsAtLowHealth = this.personality !== BotPersonality.Spartan;
    if (this.isBossMobEntity(m) || (retreatsAtLowHealth && this.health.percent < 0.32)) {
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
    const s = this.steerMove(this.wanderAngle, this.idle ? 0 : 85, dt, 3.5);
    if (s.urgency > 0.7) {
      this.wanderBlockedTime = (this.wanderBlockedTime || 0) + dt;
      if (this.wanderBlockedTime > 1.5) {
        this.wanderBlockedTime = 0;
        this.wanderAngle = helpers.random(-Math.PI, Math.PI);
      }
    } else {
      this.wanderBlockedTime = 0;
    }
    if (!this.idle) {
      this.angle = this.turnToward(this.angle, this.moveAngle, dt, 4);
    }
  }

  executeCoins(dt) {
    let coin = this.target;
    if (!coin || coin.removed) {
      coin = this.nearest(this._coins);
      if (coin) this.goalTimer.renew();
    }
    if (!coin) { this.abandonGoal(); return; }
    this.target = coin;
    const p = posOf(coin);
    const a = Math.atan2(p.y - this.shape.y, p.x - this.shape.x);
    this.steerMove(a, 130, dt, 5);
    this.angle = this.turnToward(this.angle, this.moveAngle, dt, 6);
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

    this.steerMove(moveAngle, force, dt, 5, ore);
    this.angle = this.turnToward(this.angle, toOre, dt, 5);

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
    this.steerMove(toChest, force, dt, 5);
    this.angle = this.turnToward(this.angle, toChest, dt, 5);

    if (inRange) this.trySwing(toChest);
  }

  executeHunt(dt) {
    const t = this.target;
    if (!t || t.removed) { this.sweepOrDecide(true); return; }
    const d = this.dist(t);
    const duel = this.isRichDuel(t);

    if (duel) {
      if (this.huntLastDist === undefined || d < this.huntLastDist - 1 || d < 900) {
        this.goalTimer.renew();
      }
      this.huntLastDist = this.huntLastDist === undefined ? d : Math.min(this.huntLastDist, d);
    } else {
      if (d > 3600) { this.abandonGoal(); return; }
      const foeSkill = (typeof t.skill === 'number') ? t.skill : 0.5;
      if (this.personality !== BotPersonality.Spartan
        && this.health.percent < 0.25 && foeSkill >= this.skill) {
        this.setFlee(t);
        return;
      }
    }
    this.combatMove(t, dt, {});
  }

  executeFightMob(dt) {
    const m = this.target;
    if (!m || m.removed) { this.sweepOrDecide(true); return; }
    if (this.personality !== BotPersonality.Spartan && this.health.percent < 0.3) {
      this.setFlee(m);
      return;
    }
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

    this.steerMove(away, 145, dt, 8);

    const pursuerClose = threat.type === Types.Entity.Player
      && d < this.meleeReach() * 1.15 && this.skill > 0.45;
    if (pursuerClose) {
      const back = Math.atan2(tp.y - this.shape.y, tp.x - this.shape.x);
      this.angle = this.turnToward(this.angle, back, dt, 9);
      this.trySwing(back, true);
    } else {
      this.angle = this.turnToward(this.angle, this.moveAngle, dt, 8);
    }

    if (this.personality === BotPersonality.Runner && !this.sword.isFlying
      && this.sword.flyCooldownTime <= 0 && this.throwCooldown <= 0
      && d > this.meleeReach() * 1.25 && d < this.throwRange()) {
      const throwAim = this.aimAngle(threat, true);
      this.angle = this.turnToward(this.angle, throwAim, dt, 10);
      if (Math.abs(helpers.angleDifference(this.angle, throwAim)) < 0.28) {
        this.inputs.inputDown(Types.Input.SwordThrow);
        this.throwCooldown = 2.2;
        if (Math.random() < 0.08) this.speak('swordThrow', threat);
      }
    }

    const safeDist = mobTypes.has(threat.type) ? 2200 : 1400;
    this.fleeTimer -= dt;
    const runnerStillThreatened = this.personality === BotPersonality.Runner && d < 2300;
    if (!runnerStillThreatened
      && ((d > safeDist && this.health.percent > 0.55) || this.fleeTimer <= 0)) {
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
    this.angle = this.turnToward(this.angle, aim, dt, 5.5 + this.skill * 2.8);

    let closing = 0;
    if (target.velocity) {
      closing = -((target.velocity.x * dx + target.velocity.y * dy) / dist);
    }

    const desired = reach * 0.62;
    const margin = reach * 0.2;
    this.updateStrafe(dt);

    this.combatModeTime += dt;
    if (this.combatModeTime >= 0.35) {
      let next = this.combatMode;
      if (this.combatMode === 0) {
        if (dist < desired + margin * 0.6) next = 2;
      } else if (this.combatMode === 1) {
        if (dist > desired - margin * 0.4 && closing < 40) next = 2;
      } else {
        if (dist > desired + margin * 1.7) next = 0;
        else if (dist < desired - margin * 1.7 || closing > 90) next = 1;
      }
      if (next !== this.combatMode) {
        this.combatMode = next;
        this.combatModeTime = 0;
      }
    }

    let moveAngle, force;
    if (this.combatMode === 0) {
      moveAngle = toTarget;
      force = 130;
    } else if (this.combatMode === 1) {
      moveAngle = toTarget + Math.PI + this.strafeDir * 0.6;
      force = 110;
    } else {
      moveAngle = toTarget + this.strafeDir * (Math.PI / 2);
      force = 95;
    }

    this.steerMove(moveAngle, force, dt, 6.5);

    this.tryCombatAttack(target, dist, toTarget, opts, dt);
  }

  aimAngle(target, forThrow) {
    const p = posOf(target);
    let tx = p.x, ty = p.y;
    const md = target.movedDistance;
    if (md && forThrow) {
      const dist = Math.hypot(p.x - this.shape.x, p.y - this.shape.y);
      const t = Math.min(0.8, dist / 1900);
      tx += md.x * t * this.skill;
      ty += md.y * t * this.skill;
    }
    return Math.atan2(ty - this.shape.y, tx - this.shape.x) + this.aimError;
  }

  tryCombatAttack(target, dist, toTarget, opts, dt) {
    const reach = this.meleeReach();
    const swordReady = this.sword.isAnimationFinished && !this.sword.isFlying;
    const diff = Math.abs(helpers.angleDifference(this.angle, toTarget));
    const inRange = dist <= reach * 1.12;

    const reaction = 0.45 + (1 - this.skill) * 0.3;
    const grace = 0.5;
    if (inRange && diff < 1.0) {
      this.inRangeTime += dt;
      this.outOfRangeTime = 0;
    } else {
      this.outOfRangeTime += dt;
      if (this.outOfRangeTime > grace) this.inRangeTime = 0;
    }

    if (swordReady && this.attackCooldown <= 0 && inRange
      && this.inRangeTime >= reaction && diff < 0.6) {
      this.inputs.inputDown(Types.Input.SwordSwing);
      this.attackCooldown = 0.6 + (1 - this.skill) * 0.55 + Math.random() * 0.3;
      if (Math.random() < 0.35 + (1 - this.skill) * 0.35) {
        this.attackCooldown += helpers.random(0.3, 0.85);
      }
      return;
    }

    if (!opts.spar && !this.sword.isFlying && this.sword.flyCooldownTime <= 0 && this.throwCooldown <= 0) {
      const throwAim = this.aimAngle(target, true);
      const tdiff = Math.abs(helpers.angleDifference(this.angle, throwAim));
      const inBand = dist > reach * 1.3 && dist < this.throwRange();
      const aligned = tdiff < 0.26 + (1 - this.skill) * 0.12;
      if (inBand && aligned && Math.random() < (0.25 + this.skill * 0.9) * dt) {
        this.inputs.inputDown(Types.Input.SwordThrow);
        this.throwCooldown = 2.2;
        if (Math.random() < 0.06) this.speak('swordThrow', target);
        return;
      }
    }
  }

  trySwing(aimAngle, fight = false) {
    if (this.attackCooldown > 0) return;
    if (!this.sword.isAnimationFinished || this.sword.isFlying) return;
    const diff = Math.abs(helpers.angleDifference(this.angle, aimAngle));
    if (diff > 0.75) return;
    this.inputs.inputDown(Types.Input.SwordSwing);
    this.attackCooldown = fight
      ? 0.55 + (1 - this.skill) * 0.5 + Math.random() * 0.2
      : 0.14 + (1 - this.skill) * 0.3 + Math.random() * 0.06;
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
      const zone = approxRadius(h) + myR + react;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < zone * zone && distanceSq > 0.000001) {
        const d = Math.sqrt(distanceSq);
        const st = (zone - d) / zone;
        const w = st * st * 3.2;
        rx += (dx / d) * w; ry += (dy / d) * w;
      }
    }

    for (const b of this.bosses) {
      const bp = posOf(b);
      const dx = px - bp.x, dy = py - bp.y;
      const zone = approxRadius(b) + myR + this.bossAvoidRange();
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < zone * zone && distanceSq > 0.000001) {
        const d = Math.sqrt(distanceSq);
        const st = (zone - d) / zone;
        const w = st * st * 2.8;
        rx += (dx / d) * w; ry += (dy / d) * w;
      }
    }

    for (const o of this.solids) {
      if (skipSolid && o === skipSolid) continue;
      const op = posOf(o);
      const dx = px - op.x, dy = py - op.y;
      const zone = approxRadius(o) + myR + 150;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < zone * zone && distanceSq > 0.000001) {
        const d = Math.sqrt(distanceSq);
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
      const edge = 1200 + myR;
      const dL = px + halfW, dR = halfW - px, dT = py + halfH, dB = halfH - py;
      if (dL < edge) { const w = (edge - Math.max(0, dL)) / edge; rx += w * w * 6.0; }
      if (dR < edge) { const w = (edge - Math.max(0, dR)) / edge; rx -= w * w * 6.0; }
      if (dT < edge) { const w = (edge - Math.max(0, dT)) / edge; ry += w * w * 6.0; }
      if (dB < edge) { const w = (edge - Math.max(0, dB)) / edge; ry -= w * w * 6.0; }
    }

    const ax = sx + rx, ay = sy + ry;
    const mag = Math.hypot(ax, ay);
    const repMag = Math.hypot(rx, ry);
    if (mag < 0.0001) return { angle: desiredAngle, force: desiredForce, urgency: repMag };

    let force = desiredForce;
    if (repMag > 0.9) force = Math.max(force, helpers.clamp(repMag * 70, 70, 150));

    return { angle: Math.atan2(ay, ax), force, urgency: repMag };
  }

  checkUpgrades() {
    if (!this.evolutions) return;
    const n = this.evolutions.possibleEvols.size;
    if (this.personality === BotPersonality.Runner && this.runnerRoute === 'archer'
      && this.evolutions.evolution === Types.Evolution.Basic
      && this.levels.level < 12 && n > 0) {
      // Archer unlocks at level 12. Resolve the earlier Knight-only prompt so
      // archer-route runners never appear as melee classes.
      this.evolutions.skipForUpgrade();
      this.lastEvolCount = 0;
      return;
    }
    if (n > 0 && (n !== this.lastEvolCount || this.upgradeRetryTimer <= 0)) {
      this.lastEvolCount = n;
      this.upgradeRetryTimer = helpers.random(1.5, 3.5);
      const chance = 0.35 + this.smartness * 0.55
        + Math.min(0.25, ((this.levels && this.levels.coins) || 0) / 20000);
      if (Math.random() < chance) {
        const choices = filterEvolutionChoices(
          this.personality,
          Array.from(this.evolutions.possibleEvols),
          this.runnerRoute,
        );
        if (choices.length > 0) {
          const evol = helpers.randomChoice(choices);
          this.evolutions.upgrade(evol);
        }
      }
    } else if (n === 0) {
      this.lastEvolCount = 0;
    }
  }

  damaged(damage, entity, isThrown = false, opts = null) {
    if (entity && !entity.removed && entity.shape) {
      if (entity.type === Types.Entity.Player && Math.random() < 0.5) {
        this.attackCooldown = Math.max(this.attackCooldown,
          0.15 + (1 - this.skill) * 0.25);
      }

      if (entity.type === Types.Entity.Player && !entity.isBot) {
        if (this.goal === Goal.Flee) {
        } else if (this.personality === BotPersonality.Runner) {
          this.setFlee(entity);
        } else if (this.personality !== BotPersonality.Spartan && this.health.percent < 0.3) {
          this.setFlee(entity);
        } else if (this.goal === Goal.Spar && this.target === entity) {
        } else if (!this.isTargetInRealFight(entity) && Math.random() < 0.85) {
          this.setGoal(Goal.Spar, entity);
        }
      } else if (entity.type === Types.Entity.Player && entity.isBot) {
        const relation = this.socialGraph.relation(this, entity);
        if (relation === 'neutral') this.socialGraph.turnHostile(this, entity);
        const myC = (this.levels && this.levels.coins) || 0;
        const oc = (entity.levels && entity.levels.coins) || 0;
        if (relation === 'team') {
          // Friendly collisions do not dissolve a team or start a duel.
        } else if (this.personality === BotPersonality.Runner) {
          this.setFlee(entity);
        } else if (this.isRichDuel(entity)) {
          if (this.goal !== Goal.HuntBot || this.target !== entity) {
            this.setGoal(Goal.HuntBot, entity);
          }
        } else if ((this.personality !== BotPersonality.Spartan && this.health.percent < 0.3)
          || (oc > myC * 2.2 && this.aggression < 0.6)) {
          this.setFlee(entity);
        } else if (this.goal !== Goal.HuntBot || this.target !== entity) {
          this.setGoal(Goal.HuntBot, entity);
        }
      } else if (mobTypes.has(entity.type)) {
        if (this.personality === BotPersonality.Runner) {
          this.setFlee(entity);
        } else if (this.isBossMobEntity(entity)
          || (this.personality !== BotPersonality.Spartan && this.health.percent < 0.35)) {
          this.setFlee(entity);
        } else if (this.goal !== Goal.FightMob || this.target !== entity) {
          this.setGoal(Goal.FightMob, entity);
        }
      } else if (this.health.percent < 0.5) {
        this.setFlee(entity);
      }

      if (Math.random() < 0.12) this.speak('damaged', entity);
      if (entity.type === Types.Entity.Player) this.callForTeamHelp(entity);
    }

    super.damaged(damage, entity, isThrown, opts);
  }

  remove(reason) {
    this.socialGraph.remove(this);
    super.remove(reason);
  }
}

module.exports = PlayerAI;
