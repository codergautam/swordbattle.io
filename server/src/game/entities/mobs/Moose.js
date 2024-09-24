const SAT = require("sat");
const Entity = require("../Entity");
const Circle = require("../../shapes/Circle");
const Timer = require("../../components/Timer");
const Health = require("../../components/Health");
const Property = require("../../components/Property");
const Types = require("../../Types");
const helpers = require("../../../helpers");

class MooseMob extends Entity {
  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Moose, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = this.size * 15;

    this.movementTimer = new Timer(0, 3, 4);
    this.stayTimer = new Timer(3, 2, 3);
    this.angryTimer = new Timer(0, 6, 8);
    this.damage = new Property(this.size / 20);
    this.isMoving = false;
    this.targetAngle = this.angle;
    this.startAngle = this.angle;

    this.health = new Health(50, 2);
    this.speed = new Property(10);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  update(dt) {
    this.angryTimer.update(dt);
    if (this.angryTimer.finished || !this.target || this.target.removed) {
      this.target = null;
    }

    if (this.isMoving) {
      if (this.movementTimer.finished && !this.target) {
        this.movementTimer.renew();
        this.isMoving = false;
      } else {
        this.movementTimer.update(dt);
      }
    } else {
      if (this.stayTimer.finished) {
        this.stayTimer.renew();
        this.isMoving = true;
        this.targetAngle = helpers.random(-Math.PI, Math.PI);
        this.startAngle = this.angle;
      } else {
        this.stayTimer.update(dt);
      }
    }

    if (this.isMoving) {
      if (this.target) {
        const targetAngle = helpers.angle(
          this.shape.x,
          this.shape.y,
          this.target.shape.x,
          this.target.shape.y
        );
        this.angle = helpers.angleLerp(
          this.startAngle,
          targetAngle,
          this.movementTimer.progress
        );
        this.velocity.add(
          new SAT.Vector(
            this.speed.value *
              Math.cos(this.angle) *
              (this.movementTimer.progress * 5) *
              dt,
            this.speed.value *
              Math.sin(this.angle) *
              (this.movementTimer.progress * 5) *
              dt
          )
        );
      } else {
        this.angle = helpers.angleLerp(
          this.startAngle,
          this.targetAngle,
          this.movementTimer.progress
        );
        this.velocity.add(
          new SAT.Vector(
            this.speed.value *
              Math.cos(this.angle) *
              (this.movementTimer.progress * 2) *
              dt,
            this.speed.value *
              Math.sin(this.angle) *
              (this.movementTimer.progress * 2) *
              dt
          )
        );
      }
    }

    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    this.velocity.scale(0.92);

    this.health.update(dt);
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale((selfWeight / totalWeight) * -1);

    entity.shape.applyCollision(targetMtv);
    this.shape.applyCollision(selfMtv);

    if (entity === this.target) {
      const force = this.damage.value * this.movementTimer.progress;
      const knockback = force * 20;
      entity.velocity.x -=
        (knockback * Math.cos(this.angle - Math.PI)) /
        (entity.knockbackResistance.value || 1);
      entity.velocity.y -=
        (knockback * Math.sin(this.angle - Math.PI)) /
        (entity.knockbackResistance.value || 1);
      entity.damaged(force, this);

      // 50% chance of kicking off multiple times
      if (Math.random() > 0.5) {
        this.target = null;
      }
    }
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    this.target = entity;
    if (this.movementTimer.finished) {
      this.movementTimer.renew();
    }
    this.isMoving = true;
    this.angryTimer.renew();

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

module.exports = MooseMob;
