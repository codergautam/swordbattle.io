const SAT = require('sat');
const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Property = require('../components/Property');
const Types = require('../Types');
const config = require('../../config');

class Sword extends Entity {
  constructor(player) {
    super(player.game, Types.Entity.Sword);
    this.player = player;
    this.swingAngle = -Math.PI / 3;
    this.raiseAnimation = false;
    this.decreaseAnimation = false;
    this.collidedEntities = new Set();

    const { swingDuration, damage, knockback } = config.sword;
    this.swingDuration = new Property(swingDuration);
    this.damage = new Property(damage);
    this.knockback = new Property(knockback);
    this.flySpeed = new Property(100);
    this.flyDuration = new Property(1.5);
    this.flyCooldown = new Property(5);
    this.playerSpeedBoost = new Property(1.3);

    this.swingTime = 0;
    this.swingProgress = 0;
    this.isFlying = false;
    this.isAnimationFinished = true;
    this.flyTime = 0;
    this.flyCooldownTime = 0;

    this.proportion = 0.7;
    this.shape = new Polygon(0, 0, [
      [0, 0],
      [-0.14615384615384616 * this.size, -1.7769230769230768 * this.size],
      [0.34615384615384615 * this.size, -2.4923076923076923 * this.size],
      [0.8538461538461538 * this.size, -1.7769230769230768 * this.size],
      [0.7153846153846154 * this.size, -0.015384615384615385 * this.size],
    ]);
    this.targets.push(Types.Entity.Player, Types.Entity.Wolf, Types.Entity.Bunny,
      Types.Entity.Moose, Types.Entity.Chimera, Types.Entity.Yeti, Types.Entity.Roku);
  }

  get angle() {
    return this.swingAngle * this.swingProgress;
  }

  get size() {
    return this.player.shape.radius * this.proportion;
  }

  canCollide(entity) {
    return (this.isFlying || this.raiseAnimation) && !this.collidedEntities.has(entity);
  }

  canSwing() {
    return !this.isFlying
      && this.player.inputs.isInputDown(Types.Input.SwordSwing)
      && this.isAnimationFinished;
  }

  canFly() {
    return !this.isFlying
      && this.player.inputs.isInputDown(Types.Input.SwordThrow)
      && this.flyCooldownTime <= 0;
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.isFlying = this.isFlying;
    return state;
  }

  update(dt) {
    const { player } = this;

    this.updateFlags(dt);

    if (this.isFlying) {
      player.speed.multiplier *= this.playerSpeedBoost.value;
      this.shape.x += this.flySpeed.value * Math.cos(this.shape.angle - Math.PI / 2);
      this.shape.y += this.flySpeed.value * Math.sin(this.shape.angle - Math.PI / 2);

      this.flyTime += dt;
      if (this.flyTime >= this.flyDuration.value) {
        this.isFlying = false;
        this.flyTime = 0;
        this.collidedEntities.clear();
      }
    } else {
      const angle = player.angle + this.angle + Math.PI / 2;
      const offsetX = player.shape.radius - this.size / 2.5;
      const offsetY = -player.shape.radius + this.size / 1.7;
      const offset = new SAT.Vector(offsetX, offsetY);
      this.shape.collisionPoly.setAngle(angle);
      this.shape.collisionPoly.setOffset(offset);
  
      this.shape.x = player.shape.x;
      this.shape.y = player.shape.y;
    }

    this.shape.setScale(player.shape.scale);
  }

  updateFlags(dt) {
    if (this.canSwing()) {
      this.raiseAnimation = true;
      this.isAnimationFinished = false;
      this.player.flags.set(Types.Flags.SwordSwing, true);
    }
    if (this.canFly()) {
      this.isFlying = true;
      this.flyCooldownTime = this.flyCooldown.value;
      this.player.flags.set(Types.Flags.SwordThrow, true);
      this.player.inputs.inputUp(Types.Input.SwordThrow);
    }

    if (!this.isAnimationFinished && !this.raiseAnimation && !this.player.inputs.isInputDown(Types.Input.SwordSwing)) {
      this.decreaseAnimation = true;
    }

    this.flyCooldownTime -= dt;
    if (this.flyCooldownTime < 0) {
      this.flyCooldownTime = 0;
    }

    if (this.raiseAnimation) {
      this.swingTime += dt;
      if (this.swingTime >= this.swingDuration.value) {
        this.swingTime = this.swingDuration.value;
        this.raiseAnimation = false;
      }
    }
    if (this.decreaseAnimation) {
      this.swingTime -= dt;
      if (this.swingTime <= 0) {
        this.swingTime = 0;
        this.decreaseAnimation = false;
        this.collidedEntities.clear();
        this.isAnimationFinished = true;
      }
    }

    this.swingProgress = this.swingTime / this.swingDuration.value;
  }

  processTargetsCollision(entity) {
    if (entity === this.player) return;
    if (!this.canCollide(entity)) return;
    // if (entity.inBuildingId !== this.player.inBuildingId) return;
    if (this.damage.value === 0) return;
    if (entity.inSafezone) return;

    const angle = Math.atan2(this.player.shape.y - entity.shape.y, this.player.shape.x - entity.shape.x);
    entity.velocity.x -= this.knockback.value * Math.cos(angle);
    entity.velocity.y -= this.knockback.value * Math.sin(angle);
    entity.damaged(this.damage.value, this.player);

    this.collidedEntities.add(entity);

    if (entity.removed) {
      this.player.flags.set(Types.Flags.PlayerKill, true);
    } else {
      this.player.flags.set(Types.Flags.EnemyHit, true);
    }

    if (entity.type === Types.Entity.Player) {
      if (entity.removed) {
        this.player.kills += 1;
        entity.flags.set(Types.Flags.PlayerDeath, true);
      } else {
        entity.flags.set(Types.Flags.Damaged, true);
      }
    }
  }

  cleanup() {
    super.cleanup();

    [this.damage, this.knockback, this.swingDuration, this.flySpeed, this.flyDuration].forEach(prop => prop.reset());
  }
}

module.exports = Sword;
