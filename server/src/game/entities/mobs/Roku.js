const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class RokuMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    size: 100,
    health: 250,
    regen: 2,
    speed: 20,
    damage: 2,
    jumpCooldown: [2, 3],
    fireballCooldown: [1, 2],
    fireballDuration: [1, 2],
    fireballCount: [1, 3, 5],
    fireballSpeed: 50,
    fireballSize: 50,
    fireballsSpread: Math.PI / 6,
    attackRadius: 1500,
    rotationSpeed: 1,
    density: 5,
    isBoss: false,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Roku, definition);

    this.isGlobal = this.definition.isBoss;
    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = this.size * (this.definition.isBoss ? 100 : 1);

    this.jumpTimer = new Timer(0, this.definition.jumpCooldown[0], this.definition.jumpCooldown[1]);
    this.fireballTimer = new Timer(0, this.definition.fireballCooldown[0], this.definition.fireballCooldown[1]);

    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(this.definition.speed);
    this.damage = new Property(this.definition.damage);

    this.knockbackResistance = new Property(5);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  update(dt) {
    if (!this.target || this.target.removed) {
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

        const distance = helpers.distance(this.shape.x, this.shape.y, target.shape.x, target.shape.y);
        if (distance < searchRadius) {
          this.target = target;
          break;
        }
      }
    }

    this.fireballTimer.update(dt);
    this.health.update(dt);
    this.jumpTimer.update(dt);

    if (this.target) {
      const targetAngle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);

      if (distance > this.definition.attackRadius) {
        this.target = null;
      }

      this.angle = helpers.angleLerp(this.angle, targetAngle, dt * this.definition.rotationSpeed);
      if (this.fireballTimer.finished) {
        this.fireballTimer.renew();
        const fireballs = helpers.randomChoice(this.definition.fireballCount);
        const spread = this.definition.fireballsSpread;
        for (let i = 0; i < fireballs; i++) {
          this.game.map.addEntity({
            type: Types.Entity.Fireball,
            size: this.definition.fireballSize,
            speed: this.definition.fireballSpeed,
            angle: this.angle - ((i - (fireballs - 1) / 2) * spread),
            damage: this.damage.value,
            duration: [this.definition.fireballDuration[0], this.definition.fireballDuration[1]],
            position: [this.shape.x, this.shape.y],
          });
        }
      }
    }

    if (this.jumpTimer.finished) {
      this.jumpTimer.renew();
      if (!this.target) {
        this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      }

      this.velocity.add(new SAT.Vector(
        this.speed.value * Math.cos(this.angle),
        this.speed.value * Math.sin(this.angle)));
    }

    this.velocity.scale(0.9);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    entity.shape.applyCollision(targetMtv);
    this.shape.applyCollision(selfMtv);
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    this.target = entity;

    if (this.health.isDead) {
      this.remove();
    }
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
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

module.exports = RokuMob;