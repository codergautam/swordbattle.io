const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class BunnyMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Bunny, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = this.size;

    this.jumpTimer = new Timer(0, 2, 3);
    this.runawayTimer = new Timer(0, 5, 10);

    this.health = new Health(20, 2);
    this.speed = new Property(25);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.knockbackResistance = new Property(10);

    this.spawn();
  }

  update(dt) {
    this.runawayTimer.update(dt);
    if (this.runawayTimer.finished || !this.target || this.target.removed) {
      this.target = null;
    }

    this.health.update(dt);
    if (this.target) {
      this.jumpTimer.update(dt * 3);
    } else {
      this.jumpTimer.update(dt);
    }

    if (this.jumpTimer.finished) {
      this.jumpTimer.renew();

      if (this.target) {
        const angle = helpers.angle(this.target.shape.x, this.target.shape.y, this.shape.x, this.shape.y);
        this.angle = angle;
        this.speed.multiplier *= 2.5;
      } else {
        this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      }

      this.velocity.add(new SAT.Vector(this.speed.value * Math.cos(this.angle), this.speed.value * Math.sin(this.angle)));
    }

    this.velocity.scale(0.92);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
  }

  processTargetsCollision(entity, response) {
    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    entity.shape.applyCollision(targetMtv);
    this.shape.applyCollision(selfMtv);

    this.target = entity;
    this.runawayTimer.renew();
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    this.target = entity;
    this.runawayTimer.renew();

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
  }
}

module.exports = BunnyMob;
