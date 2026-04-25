const SAT = require('sat');
const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const Health = require('../../components/Health');
const Types = require('../../Types');
const helpers = require('../../../helpers');

const focusMinRarity = 3;
const oreFocusMult = 0.6;

function perimeterPoint(points, t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push(len);
    total += len;
  }
  let d = ((t % 1) + 1) % 1 * total;
  for (let i = 0; i < points.length; i++) {
    if (d <= segs[i] || i === points.length - 1) {
      const a = points[i], b = points[(i + 1) % points.length];
      const f = segs[i] > 0 ? d / segs[i] : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    d -= segs[i];
  }
  return [points[0][0], points[0][1]];
}

const tiers = [
  [180,  100,   15,    55],
  [220,  300,   45,    42],
  [280,  700,   110,   30],
  [340,  1400,  320,   20],
  [420,  2800,  520,   13],
  [520,  5500,  800,   8],
  [620,  10000, 1150,  5],
  [720,  16000, 1500,  3],
  [820,  25000, 1900,  2],
];

const oreHitboxBase = [
  [0, 0],
  [0.2697841726618705, -0.4712230215827338],
  [0.7751798561151079, -0.46402877697841727],
  [0.9712230215827338, -0.2823741007194245],
  [1, -0.09352517985611511],
  [0.8741007194244604, 0.05935251798561151],
  [0.10431654676258993, 0.11151079136690648],
];
const oreHitboxScale = 1.175;
const oreHitboxOx = -0.12;
const oreHitboxOy = 0.13;
function lavaRockPoints(s) {
  return oreHitboxBase.map(([x, y]) => [
    (x * oreHitboxScale + oreHitboxOx) * s,
    (y * oreHitboxScale + oreHitboxOy) * s,
  ]);
}

class Ore extends Entity {
  static bossCenterNudge = [-700, 0];

  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.River, Types.Biome.Safezone, Types.Biome.TutorialZone],
    forbiddenEntities: [
      Types.Entity.IceSpike, Types.Entity.Chest, Types.Entity.IcePond,
      Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.Cactus,
      Types.Entity.OasisLake, Types.Entity.Ore,
    ],
    spawnBuffer: 150,
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Ore, objectData);

    this.isBoss = !!objectData.boss;

    if (this.isBoss) {
      this.rarity = objectData.rarity !== undefined ? objectData.rarity : 9;
      this.size = objectData.size || 1100;
      this.totalCoins = objectData.totalCoins || 50000;
      this.maxHealth = objectData.health || 1000;
    } else {
      const maxRarity = objectData.maxRarity !== undefined ? objectData.maxRarity : tiers.length - 1;
      const customWeights = objectData.tierWeights;
      let filteredWeight = 0;
      for (let i = 0; i <= maxRarity && i < tiers.length; i++) {
        filteredWeight += (customWeights ? customWeights[i] || 0 : tiers[i][3]);
      }
      let rand = helpers.randomInteger(0, Math.max(1, filteredWeight) - 1);
      this.rarity = 0;
      for (let i = 0; i <= maxRarity && i < tiers.length; i++) {
        const w = customWeights ? customWeights[i] || 0 : tiers[i][3];
        rand -= w;
        if (rand < 0) {
          this.rarity = i;
          break;
        }
      }

      this.size = tiers[this.rarity][0];
      this.totalCoins = tiers[this.rarity][1];
      this.maxHealth = tiers[this.rarity][2];
    }

    this.health = new Health(this.maxHealth, 0);

    this.density = this.isBoss ? 1e6 : 1e5;
    this.shape = Polygon.createFromPoints(0, 0, lavaRockPoints(this.size));
    this.shape.angle = 0;

    this.isGlobal = !!objectData.isBoss;

    this.needsCoastClearance = true;
    this.skipBorderCollision = true;

    this.hasFocus = this.rarity >= focusMinRarity;
    this.focusT = this.hasFocus ? Math.random() : -1;

    this.coinsPaid = 0;
    this.dripFraction = 0.6;

    this.targets.add(Types.Entity.Sword);
    this.targets.add(Types.Entity.ThrownSword);
    for (const t of Types.Groups.Obstacles) {
      if (t === Types.Entity.Sword) continue;
      this.targets.add(t);
    }

    this.lastAttacker = null;
    this.lastAttackTime = 0;

    this.claimer = null;
    this.claimTime = 0;

    this.spawn();

    if (this.isBoss) {
      const b = this.shape.boundary;
      this.shape.x += this.shape.x - (b.x + b.width / 2);
      this.shape.y += this.shape.y - (b.y + b.height / 2);
      this.shape.x += Ore.bossCenterNudge[0];
      this.shape.y += Ore.bossCenterNudge[1];
    }
  }

  update() {}

  processTargetsCollision(entity, response) {
    if (entity.type === Types.Entity.ThrownSword) {
      const proj = entity;
      if (proj.collidedEntities && proj.collidedEntities.has(this)) return;
      const player = proj.owner;
      if (!player) return;
      if (proj.collidedEntities) proj.collidedEntities.add(this);

      const currentTime = Date.now();

      if (!player.isBot) {
        const claimActive = this.claimer && !this.claimer.removed && (currentTime - this.claimTime) < 4000;
        if (claimActive && this.claimer !== player) {
          player.flags.set(Types.Flags.ContestedObject, true);
          return;
        }
        this.claimer = player;
        this.claimTime = currentTime;
      }

      const recentlyAttackedByOther = this.lastAttacker !== null
        && this.lastAttacker !== player
        && (currentTime - this.lastAttackTime) < 5000;

      let dmg = proj.damage.value;
      if (player.modifiers && player.modifiers.chestPower && !recentlyAttackedByOther) {
        dmg *= player.modifiers.chestPower;
      }
      if (player.chestDamageMultiplier) {
        dmg *= player.chestDamageMultiplier;
      }

      if (this.hasFocus) {
        let focusHit = this.swordSweepsFocus(proj);
        if (!focusHit && player.isBot && typeof player.oreFocusChance === 'function'
          && Math.random() < player.oreFocusChance()) {
          focusHit = true;
        }
        if (focusHit) {
          dmg *= 1 + oreFocusMult;
          this.focusT = (this.focusT + 0.25 + Math.random() * 0.5) % 1;
        }
      }

      this.lastAttacker = player;
      this.lastAttackTime = currentTime;
      this.applyMiningDamage(player, dmg);
      return;
    }

    if (entity.type === Types.Entity.Sword) {
      const sword = entity;
      if (!sword.canCollide(this)) return;
      sword.collidedEntities.add(this);

      const currentTime = Date.now();

      if (!sword.player.isBot) {
        const claimActive = this.claimer && !this.claimer.removed && (currentTime - this.claimTime) < 4000;
        if (claimActive && this.claimer !== sword.player) {
          sword.player.flags.set(Types.Flags.ContestedObject, true);
          return;
        }
        this.claimer = sword.player;
        this.claimTime = currentTime;
      }

      const recentlyAttackedByOther = this.lastAttacker !== null
        && this.lastAttacker !== sword.player
        && (currentTime - this.lastAttackTime) < 5000;

      let dmg = sword.damage.value;
      if (sword.player.modifiers && sword.player.modifiers.chestPower && !recentlyAttackedByOther) {
        dmg *= sword.player.modifiers.chestPower;
      }
      if (sword.player.chestDamageMultiplier) {
        dmg *= sword.player.chestDamageMultiplier;
      }

      if (this.hasFocus) {
        let focusHit = this.swordSweepsFocus(sword);
        if (!focusHit && sword.player.isBot
          && typeof sword.player.oreFocusChance === 'function'
          && Math.random() < sword.player.oreFocusChance()) {
          focusHit = true;
        }
        if (focusHit) {
          dmg *= 1 + oreFocusMult;
          this.focusT = (this.focusT + 0.25 + Math.random() * 0.5) % 1;
        }
      }

      this.lastAttacker = sword.player;
      this.lastAttackTime = currentTime;
      this.applyMiningDamage(sword.player, dmg);
      return;
    }

    if (!response) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    if (!entity.modifiers || !entity.modifiers.ramThrow) {
      this.shape.applyCollision(selfMtv);
      entity.shape.applyCollision(targetMtv);
    } else if (!entity.sword || !entity.sword.isFlying) {
      this.shape.applyCollision(selfMtv);
      entity.shape.applyCollision(targetMtv);
    }
  }

  applyMiningDamage(player, dmg) {
    const pctBefore = this.health.percent;
    this.health.damaged(dmg);
    const pctAfter = Math.max(0, this.health.percent);
    const dealt = Math.max(0, (pctBefore - pctAfter) * this.maxHealth);

    const dripPool = this.totalCoins * this.dripFraction;
    let dripPayout = (dealt / this.maxHealth) * dripPool;
    const dripRemaining = dripPool - this.coinsPaid;
    if (dripPayout > dripRemaining) dripPayout = dripRemaining;
    dripPayout = Math.round(Math.max(0, dripPayout));

    const breakPayout = this.health.isDead
      ? Math.round(this.totalCoins - this.coinsPaid - dripPayout)
      : 0;

    const totalPayout = dripPayout + breakPayout;
    if (totalPayout > 0) {
      let coins = totalPayout;
      if (player.cards && player.cards.hasMajor(121)) coins = Math.round(coins * 0.70);
      if (player.cards && player.cards.hasMajor(120)) coins = Math.round(coins * 0.50);
      if (coins > 0) this.spawnCoinsAround(coins, this.health.isDead);
      this.coinsPaid += dripPayout;
    }

    if (this.health.isDead) {
      if (this.respawnable) this.createInstance();
      this.remove();
    }
  }

  spawnCoinsAround(totalCoinValue, ring) {
    const map = this.game.map;
    let count = ring ? (6 + helpers.randomInteger(0, 4)) : (3 + helpers.randomInteger(0, 2));

    const entityBuffer = 500;
    const availableSlots = this.game.maxEntities - this.game.entities.size - entityBuffer;
    count = Math.min(count, Math.max(0, availableSlots));
    if (count <= 0) return;

    const coinValue = totalCoinValue / count;
    const center = this.shape.center;
    const bounds = this.shape.boundary;

    if (ring) {
      const baseR = Math.max(bounds.width, bounds.height) / 2 + 200;
      const phase = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const angle = phase + (i / count) * Math.PI * 2 + helpers.random(-0.2, 0.2);
        const r = baseR + helpers.random(-40, 60);
        const speed = r / 2;
        map.addEntity({
          type: Types.Entity.Coin,
          position: [center.x + helpers.random(-15, 15), center.y + helpers.random(-15, 15)],
          value: coinValue,
          velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        });
      }
    } else {
      const base = Math.random() * Math.PI * 2;
      const reach = Math.max(bounds.width, bounds.height) / 2 + 90;
      for (let i = 0; i < count; i++) {
        const angle = base + helpers.random(-0.6, 0.6);
        const r = reach + helpers.random(-30, 40);
        const speed = r / 2;
        map.addEntity({
          type: Types.Entity.Coin,
          position: [center.x + helpers.random(-12, 12), center.y + helpers.random(-12, 12)],
          value: coinValue,
          velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        });
      }
    }
  }

  focusWorldPoint() {
    const p = perimeterPoint(lavaRockPoints(this.size), this.focusT);
    return { x: this.shape.x + p[0], y: this.shape.y + p[1] };
  }

  focusRadius() {
    return Math.max(45, this.size * 0.14);
  }

  swordSweepsFocus(sword) {
    const fp = this.focusWorldPoint();
    const circle = new SAT.Circle(new SAT.Vector(fp.x, fp.y), this.focusRadius());

    if (sword.isFlying) {
      const poly = sword.shape && sword.shape.collisionPoly;
      return poly ? SAT.testPolygonCircle(poly, circle) : false;
    }

    if (typeof sword._positionMeleeCollision !== 'function') {
      const poly = sword.shape && sword.shape.collisionPoly;
      return poly ? SAT.testPolygonCircle(poly, circle) : false;
    }

    const saved = sword.swingProgress;
    let hit = false;
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      sword.swingProgress = i / steps;
      sword._positionMeleeCollision(sword.player);
      if (sword.shape.collisionPoly && SAT.testPolygonCircle(sword.shape.collisionPoly, circle)) {
        hit = true;
        break;
      }
    }
    sword.swingProgress = saved;
    sword._positionMeleeCollision(sword.player);
    return hit;
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.rarity = this.rarity;
    state.angle = this.hasFocus ? this.focusT : -1;
    return state;
  }
}

module.exports = Ore;
