const SAT = require("sat");
const Entity = require("../Entity");
const Circle = require("../../shapes/Circle");
const Timer = require("../../components/Timer");
const Health = require("../../components/Health");
const Property = require("../../components/Property");
const Types = require("../../Types");
const helpers = require("../../../helpers");

class WolfMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    attackRadius: 2000,
    health: 50,
    fireballCooldown: [5, 6, 7],
    fireballDuration: [1, 1.5],
    fireballSpeed: 50,
    fireballCount: [2, 3, 4],
    fireballsSpread: Math.PI / 3,
    fireballSize: 70,
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Wolf, objectData);

    this.isGlobal = this.definition.isBoss;

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = this.size * (this.definition.isBoss ? 100 : 7);

    this.tamedBy = null;

    this.fireballTimer = new Timer(
      0,
      this.definition.fireballCooldown[0],
      this.definition.fireballCooldown[1]
    );
    this.jumpTimer = new Timer(0, 2, 3);
    this.angryTimer = new Timer(0, 10, 20);

    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(35);
    this.damage = new Property(15);
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

    if (this.tamedBy) {
      const tamer = this.game.entities.get(this.tamedBy);
      if (!tamer || tamer?.removed) {
        this.tamedBy = null;
      } else {
        // follow player around
        const dist = helpers.distance(
          this.shape.x,
          this.shape.y,
          tamer.shape.x,
          tamer.shape.y
        );
        const followRadius = this.target ? this.attackRadius : 500;
        if (dist > followRadius) {
          const angle = helpers.angle(
            this.shape.x,
            this.shape.y,
            tamer.shape.x,
            tamer.shape.y
          );
          this.angle = angle;
          this.velocity.add(
            new SAT.Vector(
              this.speed.value * Math.cos(this.angle),
              this.speed.value * Math.sin(this.angle)
            )
          );
        }
      }
    }

    this.health.update(dt);
    if (this.target) {
      this.jumpTimer.update(dt * 3);
    } else {
      this.jumpTimer.update(dt);
    }

    if (this.definition.isBoss && !this.angryTimer.finished) {
      this.fireballTimer.update(dt);
      if (this.fireballTimer.finished) {
        this.fireballTimer.renew();
        const fireballs = helpers.randomChoice(this.definition.fireballCount);
        const spread = this.definition.fireballsSpread;
        for (let i = 0; i < fireballs; i++) {
          this.game.map.addEntity({
            type: Types.Entity.Fireball,
            size: this.definition.fireballSize,
            speed: this.definition.fireballSpeed,
            angle: this.angle - (i - (fireballs - 1) / 2) * spread,
            damage: this.damage.value,
            duration: [
              this.definition.fireballDuration[0],
              this.definition.fireballDuration[1],
            ],
            position: [this.shape.x, this.shape.y],
          });
        }
      }
    }
    if (this.jumpTimer.finished) {
      this.jumpTimer.renew();

      if (this.target) {
        const angle = helpers.angle(
          this.shape.x,
          this.shape.y,
          this.target.shape.x,
          this.target.shape.y
        );
        this.angle = angle;
        this.speed.multiplier *= 2;
      } else {
        this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      }

      this.velocity.add(
        new SAT.Vector(
          this.speed.value * Math.cos(this.angle),
          this.speed.value * Math.sin(this.angle)
        )
      );
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
    const targetMtv = mtv.clone().scale((selfWeight / totalWeight) * -1);

    const angle = helpers.angle(
      this.shape.x,
      this.shape.y,
      entity.shape.x,
      entity.shape.y
    );
    if (this.target && entity.id === this.target.id) {
      entity.damaged(this.damage.value, this);

      this.velocity.scale(-0.5);
      entity.velocity.x += 75 * Math.cos(angle);
      entity.velocity.y += 75 * Math.sin(angle);

      this.shape.applyCollision(mtv);
      entity.shape.applyCollision(mtv.clone().scale(-1));
    } else {
      entity.shape.applyCollision(targetMtv);
      this.shape.applyCollision(selfMtv);
    }
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    if (this.tamedBy !== entity.id) {
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
    if (this.tamedBy) {
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
