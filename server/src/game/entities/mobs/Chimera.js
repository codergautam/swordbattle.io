const Entity = require("../Entity");
const Circle = require("../../shapes/Circle");
const Timer = require("../../components/Timer");
const Health = require("../../components/Health");
const Property = require("../../components/Property");
const Types = require("../../Types");
const helpers = require("../../../helpers");

class ChimeraMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    attackRadius: 1000,
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Chimera, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = this.size * 30;

    this.jumpTimer = new Timer(0, 4, 5);
    this.angryTimer = new Timer(0, 15, 20);
    this.maneuverSpeed = helpers.random(1000, 2000);

    this.health = new Health(100, 2);
    this.speed = new Property(5);
    this.damage = new Property(1);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  update(dt) {
    if (this.angryTimer.finished || !this.target || this.target.removed) {
      this.target = null;
    }

    if (!this.target) {
      const searchRadius = this.definition.attackRadius;
      const searchZone = this.shape.boundary;
      searchZone.x -= searchRadius;
      searchZone.y -= searchRadius;
      searchZone.width += searchRadius;
      searchZone.height += searchRadius;

      const targets = this.game.entitiesQuadtree.get(searchZone);
      for (const { entity: target } of targets) {
        if (target === this) continue;
        if (target.type !== Types.Entity.Player) continue;

        const distance = helpers.distance(
          this.shape.x,
          this.shape.y,
          target.shape.x,
          target.shape.y
        );
        if (distance < searchRadius) {
          this.target = target;
          break;
        }
      }
    }

    this.health.update(dt);
    this.jumpTimer.update(dt);

    if (this.target) {
      const distance = helpers.distance(
        this.shape.x,
        this.shape.y,
        this.target.shape.x,
        this.target.shape.y
      );
      const progress = performance.now() / this.maneuverSpeed;
      const targetX = this.target.shape.x + distance * Math.cos(progress);
      const targetY =
        this.target.shape.y + (distance * Math.sin(2 * progress)) / 2;

      this.angle = Math.atan2(targetY - this.shape.y, targetX - this.shape.x);
      this.speed.multiplier *= 3;

      this.velocity.x += this.speed.value * Math.cos(this.angle) * dt;
      this.velocity.y += this.speed.value * Math.sin(this.angle) * dt;
    } else if (this.jumpTimer.finished) {
      this.jumpTimer.renew();
      this.angle += helpers.random(-Math.PI, Math.PI) / 2;

      this.velocity.x += this.speed.value * Math.cos(this.angle);
      this.velocity.y += this.speed.value * Math.sin(this.angle);
    }

    this.velocity.scale(0.95);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;

    if (this.target) {
      entity.damaged(this.damage.value, this);

      const angle = helpers.angle(
        this.shape.x,
        this.shape.y,
        entity.shape.x,
        entity.shape.y
      );
      entity.velocity.x -=
        (2 * Math.cos(angle)) / (entity.knockbackResistance.value || 1);
      entity.velocity.y -=
        (2 * Math.sin(angle)) / (entity.knockbackResistance.value || 1);
    } else {
      const selfWeight = this.weight;
      const targetWeight = entity.weight;
      const totalWeight = selfWeight + targetWeight;

      const mtv = this.shape.getCollisionOverlap(response);
      const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
      const targetMtv = mtv.clone().scale((selfWeight / totalWeight) * -1);
      entity.shape.applyCollision(targetMtv);
      this.shape.applyCollision(selfMtv);
    }
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    this.target = entity;
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
    super.remove();
    this.game.map.spawnCoinsInShape(this.shape, this.coinsDrop);
    this.createInstance();
  }

  cleanup() {
    super.cleanup();
    this.speed.reset();
    this.damage.reset();
  }
}

module.exports = ChimeraMob;
