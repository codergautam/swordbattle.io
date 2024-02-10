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
    this.swingAngle =-1;
    this.raiseAnimation = false;
    this.decreaseAnimation = false;
    this.collidedEntities = new Set();

    const { initialSwingDuration, damage, knockback } = config.sword;
    this.swingDuration = new Property(initialSwingDuration, true);
    this.damage = new Property(damage);
    this.knockback = new Property(knockback, true);
    this.flySpeed = new Property(100);
    this.flyDuration = new Property(1.5);
    this.flyCooldown = new Property(5);
    this.playerSpeedBoost = new Property(1.3);

    this.isFlying = false;
    this.restrictFly = false;
    this.flyTime = 0;
    this.flyCooldownTime = 0;
    this.skin = player.skin;

    this.lastSwordSwing = 0;
    this.lastSwordHeld = 0;
    this.lastStopHeld = 0;
    this.swung = false;
    this.atStart = true;
    this.held = false;

    this.proportion = 0.7;
    this.shape = new Polygon(0, 0, [[0, 0]]);
    this.targets.push(Types.Entity.Player, ...Types.Groups.Mobs);
  }

  get angle() {
    // any angle from swinging
    const maxRot = Math.PI / 2;
    return this.atStart ? 0 : this.held ? maxRot : Math.min(maxRot, (Date.now() - this.lastSwordSwing) / (this.swingDuration.value * 1000) * maxRot);
  }

  get size() {
    return this.player.shape.radius * this.proportion;
  }

  canCollide(entity) {
    return !this.collidedEntities.has(entity)
      && this.player.depth === entity.depth;
  }

  swinging() {
    return Date.now() - this.lastSwordSwing > this.swingDuration.value * 1000
      && this.player.inputs.isInputDown(Types.Input.SwordSwing)
      && !this.isFlying
      && !this.held
      && this.atStart;
  }

  notSwinging() {
    return Date.now() - this.lastSwordSwing > this.swingDuration.value * 1000
    && Date.now() - this.lastSwordHeld > this.swingDuration.value * 1000;
  }


  isHeld() {
    return (Date.now() - this.lastSwordSwing > this.swingDuration.value * 1000)
      && (this.player.inputs.isInputDown(Types.Input.SwordSwing))
      && Date.now() - this.lastStopHeld > this.swingDuration.value * 1000
      && !this.isFlying
  }

  canFly() {
    return !this.isFlying && !this.restrictFly
      && this.player.inputs.isInputDown(Types.Input.SwordThrow)
      && this.flyCooldownTime <= 0;
  }

  stopFly() {
    this.isFlying = false;
    this.flyTime = 0;
    this.collidedEntities.clear();
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.isFlying = this.isFlying;
    state.abilityActive = this.player.evolutions.evolutionEffect.isAbilityActive;
    state.skin = this.skin;
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
        this.stopFly();
      }
    } else {
      const angle = player.angle + this.angle + Math.PI / (this.atStart ? 2 : 3);
      const offsetX = player.shape.radius - this.size / 2.5;
      const offsetY = -player.shape.radius + this.size / 1.7;
      const offset = new SAT.Vector(offsetX, offsetY);

      this.updateCollisionPoly();
      this.shape.collisionPoly.setAngle(angle);
      this.shape.collisionPoly.setOffset(offset);
    }

    this.shape.setScale(player.shape.scale);
  }

  updateCollisionPoly() {
    const points = [
      [0, 0],
      [-0.14615384615384616 * this.size, -1.7769230769230768 * this.size],
      [0.34615384615384615 * this.size, -2.4923076923076923 * this.size],
      [0.8538461538461538 * this.size, -1.7769230769230768 * this.size],
      [0.7153846153846154 * this.size, -0.015384615384615385 * this.size],
    ].map(([x, y]) => new SAT.Vector(x, y));

    const pos = new SAT.Vector(this.player.shape.x, this.player.shape.y);
    this.shape.collisionPoly = new SAT.Polygon(pos, points);
  }

  updateFlags(dt) {
    if (this.swinging()) {
      console.log('hit');
      this.lastSwordSwing = Date.now();
      this.swung = true;
      this.lastSwordHeld = Date.now() + (this.swingDuration.value * 1000);
      this.atStart = false;
      this.player.flags.set(Types.Flags.SwordSwing, true);
    } else if(this.notSwinging()) {
      this.player.flags.set(Types.Flags.SwordSwing, false);
      this.atStart = true;
      if(this.collidedEntities.size > 0) {
        this.collidedEntities.clear();
      }
      this.swung = false;
    }
    if(this.isHeld()) {
      this.lastSwordHeld = Date.now();
      this.held = true;
    } else if(this.held) {
      this.lastStopHeld = Date.now();
      this.held = false;
    }
    if (this.canFly()) {
      console.log('canFly');
      this.isFlying = true;
      this.flyCooldownTime = this.flyCooldown.value;
      this.player.flags.set(Types.Flags.SwordThrow, true);
      this.player.inputs.inputUp(Types.Input.SwordThrow);
    }

    this.flyCooldownTime -= dt;
    if (this.flyCooldownTime < 0) {
      this.flyCooldownTime = 0;
    }

    this.restrictFly = false;
  }

  processTargetsCollision(entity) {
    if (entity === this.player) return;
    if (!this.canCollide(entity)) return;

    const angle = Math.atan2(this.player.shape.y - entity.shape.y, this.player.shape.x - entity.shape.x);
    let power = (this.knockback.value / (entity.knockbackResistance?.value || 1));
    power = Math.max(Math.min(power, 400), 100);
    const xComp = power * Math.cos(angle);
    const yComp = power * Math.sin(angle);
    entity.velocity.x = -1*xComp;
    entity.velocity.y =  -1*yComp;
    entity.damaged(this.damage.value, this.player);

    this.collidedEntities.add(entity);
    this.player.flags.set(Types.Flags.EnemyHit, entity.id);

    if (entity.type === Types.Entity.Player) {
      if (entity.removed) {
        this.player.kills += 1;
        this.player.flags.set(Types.Flags.PlayerKill, entity.id);
        entity.flags.set(Types.Flags.PlayerDeath, true);
      } else {
        entity.flags.set(Types.Flags.Damaged, entity.id);
      }
    }
  }

  cleanup() {
    super.cleanup();

    [this.damage, this.knockback, this.swingDuration, this.flySpeed, this.flyDuration].forEach(prop => prop.reset());
  }
}

module.exports = Sword;
