const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class FishMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Fire, Types.Biome.Earth, Types.Biome.Ice, Types.Biome.Safezone],
    attackRadius: 1000,
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Fish, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 400;

    this.tamedBy = null;

    this.jumpTimer = new Timer(1.75, 2, 3.5);
    this.angryTimer = new Timer(0, 6, 11);

    this.health = new Health(20, 7);
    this.speed = new Property(30);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.knockbackResistance = new Property(2);

    this.spawn();
  }

  update(dt) {
    this.angryTimer.update(dt);
    if (this.angryTimer.finished || !this.target || this.target.removed) {
      this.target = null;
    }

    // if(!this.tamedBy) {
    //   const realPlayer = [...this.game.players].find(player => !player.isBot);
    //   if(realPlayer) {
    //   this.tamedBy = realPlayer.id;
    //   realPlayer.tameWolf(this);
    //   }
    // }

    if(this.tamedBy) {
      const tamer = this.game.entities.get(this.tamedBy);
      if(!tamer || tamer?.removed) {
        this.tamedBy = null;
      } else {

      // follow player around
      const dist = helpers.distance(this.shape.x, this.shape.y, tamer.shape.x, tamer.shape.y);
      const followRadius = this.target ? this.attackRadius : 500;
      if(dist > followRadius) {
        const angle = helpers.angle(this.shape.x, this.shape.y, tamer.shape.x, tamer.shape.y);
        this.angle = angle;
        this.velocity.add(new SAT.Vector(
          this.speed.value * Math.cos(this.angle),
          this.speed.value * Math.sin(this.angle)));
      }
    }
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
        this.speed.multiplier *= 2;
      } else {
        this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      }

      this.velocity.add(new SAT.Vector(
        this.speed.value * Math.cos(this.angle),
        this.speed.value * Math.sin(this.angle)));
    }

    this.velocity.scale(0.93);
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
    if (entity.modifiers?.mobPower) {
      this.health.damaged(damage * entity.modifiers.mobPower);
    } else {
      this.health.damaged(damage);
    }
    if(this.tamedBy !== entity.id) {
    this.target = entity;
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
    super.remove();
    this.game.map.spawnCoinsInShape(this.shape, this.coinsDrop);
    if(this.tamedBy) {
      const tamer = this.game.entities.get(this.tamedBy);
      tamer.tamedEntities.delete(this.id);
    }
    this.createInstance();
  }

  cleanup() {
    super.cleanup();
    this.speed.reset();
  }
}

module.exports = FishMob;
