const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class YetiMob extends Entity {
  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Yeti, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.velocity = new SAT.Vector(5, 5);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.density = 3;

    this.movementTimer = new Timer(0, 3, 4);
    this.stayTimer = new Timer(3, 2, 3);
    this.angryTimer = new Timer(0, 6, 8);
    this.damage = new Property(10);
    this.isMoving = false;
    this.targetAngle = this.angle;
    this.startAngle = this.angle;

    this.health = new Health(50, 2);
    this.speed = new Property(35);
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
        const targetAngle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
        this.angle = helpers.angleLerp(this.startAngle, targetAngle, this.movementTimer.progress);
        this.speed.multiplier *= 2;
        this.velocity.add(new SAT.Vector(
          this.speed.value * Math.cos(this.angle) * (this.movementTimer.progress * 3) * dt,
          this.speed.value * Math.sin(this.angle) * (this.movementTimer.progress * 3) * dt,
        ));
      } else {
        this.angle = this.targetAngle;
        this.velocity.add(new SAT.Vector(
          this.speed.value * Math.cos(this.angle) * dt,
          this.speed.value * Math.sin(this.angle) * dt,
        ));
      }
    }

    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    this.velocity.scale(0.92);

    this.health.update(dt);
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

    if (entity === this.target) {
      const force = this.damage.value * this.movementTimer.progress;
      const knockback = force * 2;
      entity.velocity.x -= knockback * Math.cos(this.angle - Math.PI);
      entity.velocity.y -= knockback * Math.sin(this.angle - Math.PI);
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
    state.health = this.health.value.value;
    state.maxHealth = this.health.max.value;
    return state;
  }

  remove() {
    super.remove();

    this.createInstance();
  }

  cleanup() {
    super.cleanup();

    this.health.cleanup();
    this.speed.reset();
  }
}

module.exports = YetiMob;
