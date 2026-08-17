const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');
const { BoidsController, CappedFlockRegistry } = require('../../ai/Boids');

const wolfBoids = new BoidsController();
const flockRegistries = new WeakMap();
const BOID_DECISION_INTERVAL = 0.2;
const BOID_DECISION_BUCKETS = 4;

class WolfMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    attackRadius: 1000,
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    const packAnchor = objectData.packAnchor;
    super(game, Types.Entity.Wolf, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 750;
    // this.tokensDrop = 100;

    this.tamedBy = null;

    this.jumpTimer = new Timer(0, 2, 3);
    this.angryTimer = new Timer(0, 12, 21);
    this.attackTimer = new Timer(0, 0.5, 0.5);

    this.health = new Health(75, 1);
    this.speed = new Property(22);
    this.damage = new Property(12);
    this.target = null;
    this.targets.add(Types.Entity.Player);

    this.knockbackResistance = new Property(3);

    this.spawn();
    if (packAnchor) this.spawnNearPack(packAnchor);
    delete this.originalDefinition.packAnchor;
    this.initialFlockId = objectData.wolfFlockId;
    delete this.originalDefinition.wolfFlockId;
    this.wanderAngle = this.angle;
    this.boidDecisionTimer = null;
    this.boidSteering = { x: 0, y: 0 };
  }

  update(dt) {
    this.angryTimer.update(dt);
    this.attackTimer.update(dt);
    if (this.angryTimer.finished || !this.target || this.target.removed || this.targetInForbiddenBiome(this.target)) {
      this.target = null;
    }

    if (this.boidDecisionTimer === null) {
      this.boidDecisionTimer = (this.id % BOID_DECISION_BUCKETS)
        * (BOID_DECISION_INTERVAL / BOID_DECISION_BUCKETS);
    }
    this.boidDecisionTimer -= dt;
    const shouldDecide = this.boidDecisionTimer <= 0;
    let nearbyWolves = null;
    if (shouldDecide) {
      do {
        this.boidDecisionTimer += BOID_DECISION_INTERVAL;
      } while (this.boidDecisionTimer <= 0);
      nearbyWolves = this.getNearbyWolves();
      if (!this.target) this.adoptNearbyTarget(nearbyWolves);
    }

    let goal = null;
    if (this.target) {
      goal = { x: this.target.shape.x, y: this.target.shape.y, weight: 1.2 };
    } else if(this.tamedBy) {
      const tamer = this.game.entities.get(this.tamedBy);
      if(!tamer || tamer?.removed) {
        this.tamedBy = null;
      } else {
        const dist = helpers.distance(this.shape.x, this.shape.y, tamer.shape.x, tamer.shape.y);
        if(dist > 500) {
          goal = { x: tamer.shape.x, y: tamer.shape.y, weight: 0.9 };
        }
      }
    }

    this.health.update(dt);
    this.jumpTimer.update(dt * (this.target ? 1.8 : 1));

    if (this.jumpTimer.finished) {
      this.jumpTimer.renew();
      this.wanderAngle += helpers.random(-Math.PI, Math.PI) * 0.55;
    }

    const maxSpeed = this.speed.value * (this.target ? 2 : 1);
    if (shouldDecide) {
      const agent = this.toBoidAgent(maxSpeed);
      this.boidSteering = wolfBoids.steer(agent, nearbyWolves.map(wolf => wolf.toBoidAgent(
        wolf.speed.value * (wolf.target ? 2 : 1),
      )), {
        goal,
        wander: { x: Math.cos(this.wanderAngle), y: Math.sin(this.wanderAngle) },
        bounds: this.getBoidBounds(),
      });
    }

    const frameScale = Math.max(0.25, Math.min(2.5, dt * 20));
    this.velocity.x += this.boidSteering.x * frameScale;
    this.velocity.y += this.boidSteering.y * frameScale;
    const speedSquared = this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y;
    if (speedSquared > maxSpeed * maxSpeed) {
      const scale = maxSpeed / Math.sqrt(speedSquared);
      this.velocity.scale(scale);
    }
    this.velocity.scale(Math.pow(0.985, frameScale));
    this.shape.x += this.velocity.x * frameScale;
    this.shape.y += this.velocity.y * frameScale;
    if (speedSquared > 0.01) this.angle = Math.atan2(this.velocity.y, this.velocity.x);
  }

  toBoidAgent(maxSpeed) {
    return {
      id: this.id === null ? 0 : this.id,
      position: { x: this.shape.x, y: this.shape.y },
      velocity: this.velocity,
      maxSpeed,
      radius: this.shape.radius,
    };
  }

  getNearbyWolves() {
    const radius = wolfBoids.config.perceptionRadius;
    const tree = this.game.entitiesQuadtree;
    const entries = tree
      ? tree.get({
        x: this.shape.x - radius,
        y: this.shape.y - radius,
        width: radius * 2,
        height: radius * 2,
      })
      : Array.from(this.game.entities.values()).map(entity => ({ entity }));
    const candidates = [];
    for (const entry of entries) {
      const entity = entry.entity;
      if (!entity || entity === this || entity.removed || entity.type !== Types.Entity.Wolf) continue;
      const dx = entity.shape.x - this.shape.x;
      const dy = entity.shape.y - this.shape.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= radius * radius) candidates.push({ entity, distanceSquared });
    }
    candidates.sort((first, second) => first.distanceSquared - second.distanceSquared
      || first.entity.id - second.entity.id);

    const registry = this.getFlockRegistry();
    registry.ensure(this.id, this.initialFlockId);
    for (const candidate of candidates) {
      registry.ensure(candidate.entity.id, candidate.entity.initialFlockId);
    }
    const wolves = [];
    for (const candidate of candidates) {
      const wolf = candidate.entity;
      if (registry.sameFlock(this.id, wolf.id) || registry.tryMerge(this.id, wolf.id)) {
        wolves.push(wolf);
      }
    }
    return wolves;
  }

  getFlockRegistry() {
    let registry = flockRegistries.get(this.game);
    if (!registry) {
      registry = new CappedFlockRegistry(8);
      flockRegistries.set(this.game, registry);
    }
    return registry;
  }

  adoptNearbyTarget(wolves) {
    let closestTarget = null;
    let closestDistance = Infinity;
    for (const wolf of wolves) {
      const candidate = wolf.target;
      if (!candidate || candidate.removed || candidate.id === this.tamedBy) continue;
      if (this.targetInForbiddenBiome(candidate)) continue;
      if (candidate.type === Types.Entity.Player
        && candidate.cards && candidate.cards.hasMajor(126)) continue;
      const distance = helpers.distance(this.shape.x, this.shape.y, wolf.shape.x, wolf.shape.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = candidate;
      }
    }
    if (closestTarget) {
      this.target = closestTarget;
      this.angryTimer.renew();
    }
  }

  getBoidBounds() {
    const map = this.game.map;
    return {
      minX: map.x,
      minY: map.y,
      maxX: map.x + map.width,
      maxY: map.y + map.height,
      margin: wolfBoids.config.perceptionRadius,
    };
  }

  spawnNearPack(anchor) {
    const fallbackX = this.shape.x;
    const fallbackY = this.shape.y;
    const minimum = (Number(anchor.radius) || this.size) + this.size + 35;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const angle = helpers.random(-Math.PI, Math.PI);
      const distance = helpers.random(minimum, minimum + 280);
      this.shape.x = anchor.x + Math.cos(angle) * distance;
      this.shape.y = anchor.y + Math.sin(angle) * distance;
      if (!this.crossesWorldBorder()
        && this.fullyInsideSpawnZone()
        && !this.inNoBuildZone()
        && !this.collidesWithForbidden(1, false)) {
        this.spawnFailed = false;
        return;
      }
    }
    this.shape.x = fallbackX;
    this.shape.y = fallbackY;
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    const angle = helpers.angle(this.shape.x, this.shape.y, entity.shape.x, entity.shape.y);
    if (this.target && entity.id === this.target.id) {
      const willAttack = this.attackTimer.finished;
      if (willAttack) this.attackTimer.renew();

      this.velocity.scale(-0.5);
      const kbX = 75 * Math.cos(angle);
      const kbY = 75 * Math.sin(angle);
      entity.velocity.x += kbX;
      entity.velocity.y += kbY;
      if (willAttack) entity.damaged(this.damage.value, this);

      this.shape.applyCollision(mtv);
      entity.shape.applyCollision(mtv.clone().scale(-1));
    } else {
      entity.shape.applyCollision(targetMtv);
      this.shape.applyCollision(selfMtv);
    }
  }

  damaged(damage, entity) {
    if (this.removed) return;
    if (entity.modifiers?.mobPower) {
      this.health.damaged(damage * entity.modifiers.mobPower);
    } else {
      this.health.damaged(damage);
    }
    if(this.tamedBy !== entity.id) {
    // Butcherer card: mobs don't aggro
    if (!(entity.type === 1 && entity.cards && entity.cards.hasMajor(126))) {
      this.target = entity;
    }
    }
    this.angryTimer.renew();

    if (this.health.isDead) {
      this.remove();
    }
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
    state.isAngry = !!this.target;
    return state;
  }

  remove() {
    if (this.removed) return;
    if (this.id !== null) this.getFlockRegistry().remove(this.id);
    super.remove();
    this.game.map.spawnCoinsInShape(this.shape, this.coinsDrop);
    // this.game.map.spawnTokensInShape(this.shape, this.tokensDrop);
    if(this.tamedBy) {
      const tamer = this.game.entities.get(this.tamedBy);
      tamer.tamedEntities.delete(this.id);
    }
    this.createInstance();
  }

  cleanup() {
    super.cleanup();
    this.speed.reset();
    this.damage.reset();
  }
}

module.exports = WolfMob;
