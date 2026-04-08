const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class Chimera extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    attackRadius: 1000,
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 84 }, objectData);
    super(game, Types.Entity.Chimera, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 400;
    // this.tokensDrop = 100;

    this.jumpTimer = new Timer(0, 4, 5);
    this.angryTimer = new Timer(0, 4, 7);

    this.health = new Health(35, 3);
    this.speed = new Property(7);
    this.damage = new Property(2);

    this.target = null;
    this.targets.add(Types.Entity.Player);

    this.aiState = 'idle';

    this.altitude = 0;
    this.highAltitude = 320;
    this.lowAltitude = 30;

    this.baseTurnRate = 2.0;
    this.turnRate = this.baseTurnRate;
    this.turnDirection = 1;

    this.normalSpeed = this.speed.value * 8;
    this.maxChargeSpeed = this.speed.value * 5.5;
    this.chargeAccel = 800;

    this.climbRate = 350;
    this.diveRate = 450;

    this.scale = 1;
    this.shadowScale = 1;
    this.shadowAlpha = 1;

    this.hasDealtChargeDamage = false;
    this.chargeSpeed = 0;

    this.knockbackResistance = new Property(8);

    this.spawn();
  }

  get canBeHitByPlayer() {
    return this.altitude <= this.lowAltitude;
  }

  get isFlying() {
    return this.altitude > 0;
  }

  moveForward(dt, mult = 1) {
    const s = this.normalSpeed * mult;
    this.velocity.x += Math.cos(this.angle) * s * dt;
    this.velocity.y += Math.sin(this.angle) * s * dt;
  }

  updateIdle(dt) {
  const driftAngle = this.angle + helpers.random(-0.4, 0.4);
  const driftSpeed = this.normalSpeed * 0.2;

  this.velocity.x += Math.cos(driftAngle) * driftSpeed * dt;
  this.velocity.y += Math.sin(driftAngle) * driftSpeed * dt;

  if (this.jumpTimer.finished) {
    this.angle += helpers.random(-1.0, 1.0);
    this.jumpTimer.renew();
  }
}

  updateRetreat(dt) {
    if (!this.target) {
      this.aiState = 'landing';
      return;
    }

    const angleAway = helpers.angle(
      this.target.shape.x, this.target.shape.y,
      this.shape.x, this.shape.y
    );
    this.angle = angleAway;

    this.moveForward(dt, 4.6);

    this.altitude = Math.min(this.highAltitude, this.altitude + this.climbRate * dt);

    this.scale = this.altitude * 0.005;

    const dist = helpers.distance(
      this.shape.x, this.shape.y,
      this.target.shape.x, this.target.shape.y
    );

    if (dist >= 500) {
      this.altitude = this.highAltitude;
      this.aiState = 'pivot';
      this.turnRate = this.baseTurnRate + helpers.random(-0.6, 0.6);

      this.turnDirection = Math.random() < 0.5 ? 1 : -1;
    }
  }

  updatePivot(dt) {
    if (!this.target) {
      this.aiState = 'landing';
      return;
    }

    this.altitude = this.highAltitude;

    this.angle += this.turnDirection * this.turnRate * dt;
    this.moveForward(dt, 1.4);

    const angleToPlayer = helpers.angle(
      this.shape.x, this.shape.y,
      this.target.shape.x, this.target.shape.y
    );
    const diff = Math.abs(helpers.angleDifference(this.angle, angleToPlayer));

    if (diff < 0.25) {
      this.aiState = 'charge';
      this.chargeSpeed = this.speed.value * 2.0;
      this.hasDealtChargeDamage = false;
    }
  }

  updateCharge(dt) {
    if (!this.target) {
      this.aiState = 'landing';
      return;
    }

    if (this.altitude > this.lowAltitude) {
      this.altitude = Math.max(this.lowAltitude, this.altitude - this.diveRate * dt);
    }

    const angleToPlayer = helpers.angle(
      this.shape.x, this.shape.y,
      this.target.shape.x, this.target.shape.y
    );
    this.angle = angleToPlayer;

    this.chargeSpeed = Math.min(
      this.maxChargeSpeed,
      this.chargeSpeed + this.chargeAccel * dt
    );

    this.velocity.x = Math.cos(this.angle) * this.chargeSpeed;
    this.velocity.y = Math.sin(this.angle) * this.chargeSpeed;
  }

  updateLanding(dt) {
    this.altitude = Math.max(0, this.altitude - 200 * dt);
    if (this.altitude === 0) this.aiState = 'idle';
  }

  update(dt) {

    this.jumpTimer.update(dt);
    this.angryTimer.update(dt);

    if (this.target && this.aiState === 'idle') {
      this.aiState = 'retreat';
    }

    if (this.angryTimer.finished) {
      this.target = null;
      this.aiState = this.isFlying ? 'landing' : 'idle';
    }

    switch (this.aiState) {
      case 'retreat': this.updateRetreat(dt); break;
      case 'pivot': this.updatePivot(dt); break;
      case 'charge': this.updateCharge(dt); break;
      case 'landing': this.updateLanding(dt); break;
      default: this.updateIdle(dt); break;
    }

    this.velocity.scale(0.95);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;

    if (this.aiState !== 'pivot') {
      const { x, y } = this.velocity;
      if (Math.abs(x) + Math.abs(y) > 0.001) {
        this.angle = Math.atan2(y, x);
      }
    }

    const t = Math.min(1, this.altitude / this.highAltitude);
    this.scale = 1 + t * 0.5;
    this.shadowScale = 1 + t * 1.1;
    this.shadowAlpha = 1 - t * 0.5;
  }

  applyVelocityKnockback(entity, mult = 1) {
    const vx = this.velocity.x, vy = this.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed <= 0.001) return;

    const force = (2 + speed) * 0.2 * mult;

    entity.velocity.x += (vx / speed) * force / (entity.knockbackResistance.value || 1);
    entity.velocity.y += (vy / speed) * force / (entity.knockbackResistance.value || 1);
  }

  processTargetsCollision(entity) {
    if (entity.type === Types.Entity.Player) {
      if (this.aiState === 'charge' && this.canBeHitByPlayer && !this.hasDealtChargeDamage) {
        entity.damaged(this.damage.value * 4, this);

        if (this.altitude <= this.lowAltitude) {
          this.applyVelocityKnockback(entity, 5 * 4);
        }

        this.hasDealtChargeDamage = true;
        this.aiState = 'retreat';
      }
      return;
    }
  }

  damaged(dmg, entity) {
    if (entity?.type === Types.Entity.Player && this.altitude > this.lowAltitude) {
      return;
    }

    this.health.damaged(dmg);

    if (this.aiState === 'charge') {
      this.aiState = 'retreat';
    } else if (this.aiState !== 'retreat') {
      this.aiState = 'retreat';
    }

    // Butcherer card: mobs don't aggro
    if (!(entity.type === 1 && entity.cards && entity.cards.hasMajor(126))) {
      this.target = entity;
    }
    
    this.angryTimer.renew();

    if (this.health.isDead) this.remove();
  }

  createState() {
    const s = super.createState();
    s.angle = this.angle;
    s.altitude = this.altitude;
    s.state = this.aiState;
    s.scale = this.scale;
    s.shadowScale = this.shadowScale;
    s.shadowAlpha = this.shadowAlpha;
    return s;
  }

  remove() {
    if (this.removed) return;
    super.remove();
    this.game.map.spawnCoinsInShape(this.shape, this.coinsDrop);
    // this.game.map.spawnTokensInShape(this.shape, this.tokensDrop);
    this.createInstance();
  }

  cleanup() {
    super.cleanup();
    this.speed.reset();
    this.damage.reset();
  }
}

module.exports = Chimera;