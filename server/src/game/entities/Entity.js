const SAT = require('sat')
const State = require('../components/State');
const Health = require('../components/Health');
const Circle = require('../shapes/Circle');
const Types = require('../Types');
const helpers = require('../../helpers');

class Entity {
  static defaultDefinition = {
    forbiddenBiomes: [],
    forbiddenEntities: [],
    spawnBuffer: 0,
  };

  constructor(game, type, definition = {}) {
    this.game = game;
    this.type = type;

    this.id = null;
    this.shape = null;
    this.removed = false;
    this.isStatic = false;
    this.isGlobal = false;
    this.depth = 0;
    this.targets = new Set();
    this.velocity = new SAT.Vector(0, 0);
    this.state = new State(this.createState.bind(this));

    this.density = 1;
    this.spawnZone = null;
    this.respawnable = false;

    this.originalDefinition = { ...definition }; // used for entity respawn
    this.definition = definition;
    this.processDefinition();
  }

  get weight() {
    return this.shape.area * this.density;
  }

  processDefinition() {
    this.definition = Object.assign({}, Entity.defaultDefinition, this.constructor.defaultDefinition, this.definition);

    const { definition } = this;

    if (definition.density !== undefined) {
      this.density = definition.density;
    }
    if (definition.size !== undefined) {
      if (Array.isArray(definition.size)) {
        this.size = helpers.random(definition.size[0], definition.size[1]);
      } else {
        this.size = definition.size;
      }
    }

    if (definition.spawnZone !== undefined) {
      this.spawnZone = definition.spawnZone;
    }
    this.avoidBiomes = definition.avoidBiomes || [];
    if (definition.skin !== undefined) {
      this.skin = definition.skin;
    }
    this.respawnable = !!(definition.respawnable
      && (this.spawnZone || Array.isArray(definition.position)));

    this.spacingGroup = definition.spacingGroup !== undefined
      ? definition.spacingGroup
      : Entity.spacingTypes.has(this.type);
    this.spawnGap = definition.spawnGap !== undefined
      ? definition.spawnGap
      : (this.spacingGroup ? Entity.defaultSpacingGap : 0);
    this.discardIfBlocked = definition.discardIfBlocked !== undefined
      ? definition.discardIfBlocked
      : (this.spacingGroup && this.type !== Types.Entity.Chest && this.type !== Types.Entity.Ore);
    this.alsoAvoidShrubs = false;
    this.avoidPickups = false;
    this.densityVary = definition.densityVary || false;
  }

  densityNoise(x, y) {
    const n = 0.32 * Math.sin(x * 0.0012 + y * 0.0007)
            + 0.22 * Math.sin(y * 0.0017 - x * 0.0009 + 1.3)
            + 0.14 * Math.sin((x + y) * 0.0021 + 2.7);
    return Math.max(0, Math.min(1, 0.5 + n));
  }

  densityAccepts() {
    return Math.random() < 0.55 + 0.45 * this.densityNoise(this.shape.x, this.shape.y);
  }

  approxRadius(shape) {
    if (!shape) return 0;
    if (shape.radius) return shape.radius;
    const b = shape.boundary;
    if (b) return Math.max(b.width, b.height) / 2;
    return 0;
  }

  overlapsSpacing() {
    const rThis = this.approxRadius(this.shape);
    const bT = this.shape.boundary;
    const cxT = bT ? bT.x + bT.width / 2 : this.shape.x;
    const cyT = bT ? bT.y + bT.height / 2 : this.shape.y;
    for (const [, e] of this.game.entities) {
      if (e === this || !e.shape) continue;
      let avoid = e.spacingGroup;
      if (!avoid && this.alsoAvoidShrubs && e.type === Types.Entity.AmbientShrub) avoid = true;
      if (!avoid && this.avoidPickups
        && (e.type === Types.Entity.Coin || e.type === Types.Entity.Token)) avoid = true;
      if (!avoid) continue;
      const be = e.shape.boundary;
      const cxe = be ? be.x + be.width / 2 : e.shape.x;
      const cye = be ? be.y + be.height / 2 : e.shape.y;
      const dx = cxe - cxT;
      const dy = cye - cyT;
      const minD = rThis + this.approxRadius(e.shape) + this.spawnGap + (e.spawnGap || 0);
      if (dx * dx + dy * dy < minD * minD) return true;
    }
    return false;
  }

  spawn() {
    if (this.spawnZone) {
      this.spawnZone.randomSpawnInside(this.shape);

      const doSpacing = this.spacingGroup || this.alsoAvoidShrubs;
      const maxTries = this.needsCoastClearance ? 120 : 30;
      let tries = 0;
      while (tries < maxTries && (
        this.collidesWithForbidden(1, false)
        || this.crossesWorldBorder()
        || !this.fullyInsideSpawnZone()
        || this.inNoBuildZone()
        || (doSpacing && this.overlapsSpacing())
        || (this.densityVary && !this.densityAccepts())
        || (this.needsCoastClearance && this.tooCloseToCoast())
      )) {
        tries += 1;
        if (this.needsCoastClearance && this.sampleLandSpawn() && this.fullyInsideSpawnZone()) continue;
        this.spawnZone.randomSpawnInside(this.shape);
      }
      if (this.crossesWorldBorder() || !this.fullyInsideSpawnZone()) {
        this.spawnFailed = true;
      }
      if (this.needsCoastClearance && this.tooCloseToCoast()) {
        this.spawnFailed = true;
      }
      if (this.discardIfBlocked && doSpacing && this.overlapsSpacing()) {
        this.spawnFailed = true;
      }
      if (this.inNoBuildZone() || this.collidesWithForbidden(1, false)) {
        this.spawnFailed = true;
      }
    } else if (Array.isArray(this.definition.position)) {
      this.shape.x = this.definition.position[0];
      this.shape.y = this.definition.position[1];
      if (this.crossesWorldBorder()) {
        this.spawnFailed = true;
      }
    }
  }

  inNoBuildZone() {
    if (this.type === Types.Entity.Coin
      || this.type === Types.Entity.Token
      || this.type === Types.Entity.Player) return false;
    const map = this.game && this.game.map;
    if (!map || !this.shape) return false;
    const b = this.shape.boundary;
    if (!b) return false;
    const pts = [
      [b.x + b.width / 2, b.y + b.height / 2],
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x, b.y + b.height],
      [b.x + b.width, b.y + b.height],
    ];
    for (const biome of map.biomes) {
      if (biome.type !== Types.Biome.Safezone
        && biome.type !== Types.Biome.TutorialZone) continue;
      if (!biome.shape.isPointInside) continue;
      for (const [cx, cy] of pts) {
        if (biome.shape.isPointInside(cx, cy)) return true;
      }
    }
    return false;
  }

  sampleLandSpawn() {
    const map = this.game && this.game.map;
    if (!map || !this.shape) return false;
    const land = (map.landBiomes || map.biomes).filter(bi =>
      bi.shape && typeof bi.shape.getRandomPoint === 'function');
    if (!land.length) return false;
    const biome = land[Math.floor(Math.random() * land.length)];
    const p = biome.shape.getRandomPoint();
    if (!p) return false;
    const before = this.shape.boundary;
    const cx = before.x + before.width / 2;
    const cy = before.y + before.height / 2;
    this.shape.x += p.x - cx;
    this.shape.y += p.y - cy;
    return true;
  }

  tooCloseToCoast() {
    const map = this.game && this.game.map;
    if (!map || !this.shape) return false;
    const b = this.shape.boundary;
    if (!b) return false;
    const footprintR = Math.sqrt((b.width / 2) ** 2 + (b.height / 2) ** 2);
    const margin = 90 + footprintR * 0.25;
    const clearance = footprintR + margin;
    const px = b.x + b.width / 2, py = b.y + b.height / 2;

    const footprintPts = [
      [px, py],
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x, b.y + b.height],
      [b.x + b.width, b.y + b.height],
    ];
    for (const biome of map.biomes) {
      if (biome.type !== Types.Biome.Safezone
        && biome.type !== Types.Biome.TutorialZone) continue;
      if (!biome.shape.isPointInside) continue;
      for (const [cx, cy] of footprintPts) {
        if (biome.shape.isPointInside(cx, cy)) return true;
      }
    }

    let containing = null;
    for (const biome of map.landBiomes || map.biomes) {
      if (biome.type === Types.Biome.River
        || biome.type === Types.Biome.Safezone
        || biome.type === Types.Biome.TutorialZone) continue;
      if (biome.shape.isPointInside && biome.shape.isPointInside(px, py)) {
        containing = biome;
        break;
      }
    }
    if (!containing) return true;

    for (let i = 1; i < footprintPts.length; i++) {
      const [cx, cy] = footprintPts[i];
      if (!containing.shape.isPointInside || !containing.shape.isPointInside(cx, cy)) {
        return true;
      }
    }

    const nearest = Entity.closestPointOnBiomeOutline(containing, px, py);
    if (!nearest) return false;
    return Math.sqrt(nearest.distSq) < clearance;
  }

  fullyInsideSpawnZone() {
    const zone = this.spawnZone;
    if (!zone || typeof zone.isPointInside !== 'function') return true;
    const b = this.shape && this.shape.boundary;
    if (!b) return true;
    const corners = [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x, b.y + b.height],
      [b.x + b.width, b.y + b.height],
      [b.x + b.width / 2, b.y + b.height / 2],
    ];
    for (let i = 0; i < corners.length; i++) {
      if (!zone.isPointInside(corners[i][0], corners[i][1])) return false;
    }
    return true;
  }

  crossesWorldBorder() {
    const map = this.game && this.game.map;
    if (!map || !this.shape) return false;
    const b = this.shape.boundary;
    if (!b) return false;
    return b.x < map.x
      || b.y < map.y
      || b.x + b.width > map.x + map.width
      || b.y + b.height > map.y + map.height;
  }

  targetInForbiddenBiome(target) {
    if (!target || !target.shape || this.definition.forbiddenBiomes.length === 0) return false;
    const tx = target.shape.x;
    const ty = target.shape.y;
    let inAnyBiome = false;
    for (const biome of this.game.map.biomes) {
      if (!biome.shape || !biome.shape.isPointInside || !biome.shape.isPointInside(tx, ty)) continue;
      inAnyBiome = true;
      if (this.definition.forbiddenBiomes.includes(biome.type)) return true;
    }
    if (!inAnyBiome && this.definition.forbiddenBiomes.includes(Types.Biome.River)) return true;
    return false;
  }

  collidesWithForbidden(dt, collide = false) {
    if (this.definition.forbiddenBiomes.length === 0
      && this.definition.forbiddenEntities.length === 0
      && this.avoidBiomes.length === 0) return false;

    const riverInset = this.definition.riverInset || 0;

    let insideRiver = false;
    if (riverInset > 0) {
      const rivers = this.game.map.biomesByType?.get(Types.Biome.River) || this.game.map.biomes;
      for (const biome of rivers) {
        if (biome.type !== Types.Biome.River) continue;
        if (biome.shape.isPointInside(this.shape.x, this.shape.y)) {
          insideRiver = true;
          break;
        }
      }
    }

    for (const biomeType of this.definition.forbiddenBiomes) {
      const typedBiomes = this.game.map.biomesByType?.get(biomeType) || this.game.map.biomes;
      for (const biome of typedBiomes) {
        if (biome.type !== biomeType) continue;

        if (insideRiver && biomeType !== Types.Biome.Safezone) {
          Entity._sharedResponse.clear();
          if (biome.shape.collides(this.shape, Entity._sharedResponse)) continue;
        }

        Entity._sharedResponse.clear();

        let collisionTarget = this.shape;
        if (riverInset > 0 && this.shape.type === Types.Shape.Circle) {
          const buf = Entity._riverInsetCircle;
          buf.collisionPoly.pos.x = this.shape.x;
          buf.collisionPoly.pos.y = this.shape.y;
          buf.collisionPoly.r = this.shape.radius + riverInset;
          collisionTarget = buf;
        }

        if (biome.shape.collides(collisionTarget, Entity._sharedResponse)) {
          if (!collide) return true;

          const mtv = collisionTarget.getCollisionOverlap(Entity._sharedResponse);
          this.shape.applyCollision(mtv);
        }

        if (!collide && this.definition.spawnBuffer > 0) {
          const buf = Entity._spawnBufferCircle;
          buf.collisionPoly.pos.x = this.shape.x;
          buf.collisionPoly.pos.y = this.shape.y;
          buf.collisionPoly.r = (this.size || 0) / 2 + this.definition.spawnBuffer;
          Entity._sharedResponse.clear();
          if (biome.shape.collides(buf, Entity._sharedResponse)) {
            return true;
          }
        }
      }
    }

    if (this.definition.forbiddenBiomes.includes(Types.Biome.River)) {
      const px = this.shape.x, py = this.shape.y;
      const land = this.game.map.landBiomes || this.game.map.biomes.filter(b =>
        b.type !== Types.Biome.River
        && b.type !== Types.Biome.Safezone
        && b.type !== Types.Biome.TutorialZone);
      let containingBiome = null;
      const cachedLand = this._containingLandBiome;
      if (cachedLand && cachedLand.shape.isPointInside
        && cachedLand.shape.isPointInside(px, py)) {
        containingBiome = cachedLand;
      } else {
        for (const biome of land) {
          if (biome.shape.isPointInside && biome.shape.isPointInside(px, py)) {
            containingBiome = biome;
            break;
          }
        }
      }
      this._containingLandBiome = containingBiome;
      let nearest = null;
      let nearestDistSq = Infinity;
      if (containingBiome) {
        nearest = Entity.closestPointOnBiomeOutline(containingBiome, px, py);
        if (nearest) nearestDistSq = nearest.distSq;
      } else {
        for (const biome of land) {
          const pt = Entity.closestPointOnBiomeOutline(biome, px, py);
          if (pt && pt.distSq < nearestDistSq) {
            nearestDistSq = pt.distSq;
            nearest = pt;
          }
        }
      }

      const isMob = Types.Groups.Mobs.includes(this.type);
      const radius = (this.shape.radius != null ? this.shape.radius : 0);
      const coastBuffer = collide ? 0 : 8;

      if (!containingBiome) {
        if (!nearest) return false;
        if (!collide) return true;
        const dx = nearest.x - px, dy = nearest.y - py;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const norm = { x: dx / len, y: dy / len };
        const inset = 6;
        this.shape.x = nearest.x + norm.x * inset;
        this.shape.y = nearest.y + norm.y * inset;
        if (isMob) {
          const vDotN = this.velocity.x * norm.x + this.velocity.y * norm.y;
          if (vDotN < 0) {
            this.velocity.x -= vDotN * norm.x;
            this.velocity.y -= vDotN * norm.y;
          }
        }
      } else if (radius > 0 && nearest) {
        const distToCoast = Math.sqrt(nearestDistSq);
        if (distToCoast < radius + coastBuffer) {
          if (!collide) return true;
          const dx = px - nearest.x, dy = py - nearest.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const norm = { x: dx / len, y: dy / len };
          const correction = (radius + 4) - distToCoast;
          if (correction > 0) {
            this.shape.x += norm.x * correction;
            this.shape.y += norm.y * correction;
          }
          if (isMob) {
            const vOut = this.velocity.x * (-norm.x) + this.velocity.y * (-norm.y);
            if (vOut > 0) {
              this.velocity.x += vOut * norm.x;
              this.velocity.y += vOut * norm.y;
            }
          }
        }
      } else if (containingBiome && this.shape.type === Types.Shape.Polygon && nearest) {
        const b = this.shape.boundary;
        const corners = [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x, b.y + b.height],
          [b.x + b.width, b.y + b.height],
        ];
        let worstDx = 0, worstDy = 0, worstD2 = 0;
        for (const [cx, cy] of corners) {
          if (containingBiome.shape.isPointInside && containingBiome.shape.isPointInside(cx, cy)) continue;
          const cornerNearest = Entity.closestPointOnBiomeOutline(containingBiome, cx, cy);
          if (!cornerNearest) continue;
          const ddx = cornerNearest.x - cx, ddy = cornerNearest.y - cy;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 > worstD2) {
            worstD2 = d2;
            worstDx = ddx;
            worstDy = ddy;
          }
        }
        if (worstD2 > 0) {
          if (!collide) return true;
          this.shape.x += worstDx + Math.sign(worstDx) * 4;
          this.shape.y += worstDy + Math.sign(worstDy) * 4;
        }
      }
    }

    for (const biome of this.avoidBiomes) {
      Entity._sharedResponse.clear();
      if (biome.shape.collides(this.shape, Entity._sharedResponse)) {
        if (!collide) return true;

        const mtv = this.shape.getCollisionOverlap(Entity._sharedResponse);
        this.shape.applyCollision(mtv);
      }
    }

    const useQuadtree = !!this.game.entitiesQuadtree;

    for (const entityType of this.definition.forbiddenEntities) {
      const entities = useQuadtree
        ? this.game.entitiesQuadtree.get(this.shape.boundary)
        : Array.from(this.game.entities.values()).map(e => ({ entity: e }));
      for (const res of entities) {
        const entity = res.entity;
        if (entity === this) continue;
        if (entity.type !== entityType) continue;

        const collisionShape = entity.depthZone ? entity.depthZone : entity.shape;
        let testShape = this.shape;
        if (!collide && this.spawnGap > 0 && this.shape.type === Types.Shape.Circle) {
          const buf = Entity.spawnGapCircle;
          buf.collisionPoly.pos.x = this.shape.x;
          buf.collisionPoly.pos.y = this.shape.y;
          buf.collisionPoly.r = this.shape.radius + this.spawnGap;
          testShape = buf;
        }
        Entity._sharedResponse.clear();
        if (collisionShape.collides(testShape, Entity._sharedResponse)) {
          if (!collide) return true;

          const mtv = this.shape.getCollisionOverlap(Entity._sharedResponse);
          this.shape.applyCollision(mtv);
        }
      }
    }
    return false;
  }

  createState() {
    const data = {
      id: this.id,
      type: this.type,
      shapeData: this.shape.getData(),
      depth: this.depth,
    };
    if (this.health instanceof Health) {
      data.healthPercent = this.health.percent;
    }
    if (this.skin) data.skin = this.skin;
    return data;
  }

  update() {
    // Use velocity to restrict spawn outside biomes
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    if (isNaN(this.shape.x) || isNaN(this.shape.y)) {
      console.error(`[ENTITY_NAN] type=${this.type} id=${this.id} pos became NaN after velocity. vx=${this.velocity.x} vy=${this.velocity.y}`);
      this.shape.x = 0;
      this.shape.y = 0;
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
    // prevent leaving map
    const map = this.game.map;
    this.shape.x = helpers.clamp(this.shape.x, map.x, map.x + map.width);
    this.shape.y = helpers.clamp(this.shape.y, map.y, map.y + map.height);
    this.velocity.scale(0.9);
  }

  processTargetsCollision(targetEntity, dt) {}

  cleanup() {
    this.state.cleanup();
    this.shape.cleanup();
    if (this.health instanceof Health) {
      this.health.cleanup();
    }
  }

  createInstance() {
    if (this.definition.respawnTime) {
      this.game.map.addEntityTimer(this.originalDefinition, this.definition.respawnTime);
    } else {
      this.game.map.addEntity(this.originalDefinition);
    }
  }

  remove() {
    this.game.removeEntity(this);
  }
}

Entity._sharedResponse = new SAT.Response();
Entity._spawnBufferCircle = Circle.create(0, 0, 1);
Entity._riverInsetCircle = Circle.create(0, 0, 1);
Entity.spawnGapCircle = Circle.create(0, 0, 1);

Entity.spacingTypes = new Set([
  Types.Entity.Bush, Types.Entity.Rock, Types.Entity.MossyRock,
  Types.Entity.LavaRock, Types.Entity.Ore, Types.Entity.Chest,
  Types.Entity.IceMound, Types.Entity.IceSpike, Types.Entity.Cactus,
  Types.Entity.DeadBush,
]);
Entity.defaultSpacingGap = 45;

Entity.closestPointOnBiomeOutline = function (biome, px, py) {
  const shape = biome.shape;
  if (!shape) return null;

  if (shape.type === Types.Shape.Circle) {
    const dx = px - shape.x, dy = py - shape.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const cx = shape.x + (dx / d) * shape.radius;
    const cy = shape.y + (dy / d) * shape.radius;
    const ddx = cx - px, ddy = cy - py;
    return { x: cx, y: cy, distSq: ddx * ddx + ddy * ddy };
  }

  if (shape.type !== Types.Shape.Polygon) return null;

  let pts;
  const ox = shape.x;
  const oy = shape.y;
  if (shape.isComplex) {
    pts = shape.points;
  } else {
    pts = shape.collisionPoly.calcPoints;
  }
  if (!pts || pts.length < 2) return null;

  let best = null;
  let bestD2 = Infinity;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const ax = ox + a.x, ay = oy + a.y;
    const bx = ox + b.x, by = oy + b.y;
    const ex = bx - ax, ey = by - ay;
    const lenSq = ex * ex + ey * ey;
    if (lenSq === 0) continue;
    let t = ((px - ax) * ex + (py - ay) * ey) / lenSq;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const cx = ax + t * ex, cy = ay + t * ey;
    const ddx = cx - px, ddy = cy - py;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = { x: cx, y: cy, distSq: d2 };
    }
  }
  return best;
};

module.exports = Entity;
