const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class ScorpionMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Scorpion, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 450;

    this.moveTimer = new Timer(1.5, 2, 3);
    this.attackCooldown = new Timer(0, 2, 3);

    this.health = new Health(45, 3);
    this.speed = new Property(35);
    this.damage = new Property(20);
    this.poisonDamage = new Property(3);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.knockbackResistance = new Property(20);
    this.isAttacking = false;
    this.poisonedTargets = new Map(); // Map of targetId -> Timer

    this.spawn();
  }

  update(dt) {
    this.health.update(dt);
    this.moveTimer.update(dt);
    this.attackCooldown.update(dt);
    
    // Update poison effects
    this.updatePoisonEffects(dt);

    if (this.moveTimer.finished) {
      this.moveTimer.renew();

      // Random wandering behavior
      this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      this.velocity.add(new SAT.Vector(
        this.speed.value * Math.cos(this.angle),
        this.speed.value * Math.sin(this.angle)
      ));
    }

    // Apply friction and move
    this.velocity.scale(0.93);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
  }

  updatePoisonEffects(dt) {
    // Process all poisoned targets
    for (const [targetId, data] of this.poisonedTargets.entries()) {
      const target = this.game.entities.get(targetId);
      if (!target || target.removed) {
        this.poisonedTargets.delete(targetId);
        continue;
      }

      data.timer.update(dt);
      data.tickTimer.update(dt);

      // Apply damage over time
      if (data.tickTimer.finished) {
        data.tickTimer.renew();
        target.damaged(this.poisonDamage.value, this);
      }

      // Remove poison effect when timer expires
      if (data.timer.finished) {
        this.poisonedTargets.delete(targetId);
      }
    }
  }

  applyPoison(entity) {
    if (!entity || entity.removed) return;

    // Apply poison effect to the target
    const poisonDuration = new Timer(0, 4, 4); // 4 seconds of poison
    const poisonTickTimer = new Timer(0, 0.8, 0.8); // Damage every 0.8 seconds

    this.poisonedTargets.set(entity.id, {
      timer: poisonDuration,
      tickTimer: poisonTickTimer
    });
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    // Standard collision resolution
    entity.shape.applyCollision(targetMtv);
    this.shape.applyCollision(selfMtv);
    
    // Single attack on contact if cooldown is finished
    if (this.attackCooldown.finished) {
      this.attackCooldown.renew();
      this.performSingleAttack(entity);
    }
  }

  performSingleAttack(entity) {
    if (!entity || entity.removed) return;

    // Set attacking flag briefly for animation purposes
    this.isAttacking = true;
    setTimeout(() => { this.isAttacking = false; }, 300);

    // Deal immediate damage
    entity.damaged(this.damage.value, this);
    
    // Apply poison effect
    this.applyPoison(entity);

    // Apply knockback
    const angle = helpers.angle(this.shape.x, this.shape.y, entity.shape.x, entity.shape.y);
    const knockbackForce = 70;
    entity.velocity.x += knockbackForce * Math.cos(angle);
    entity.velocity.y += knockbackForce * Math.sin(angle);
    
    // Slight recoil for the scorpion
    this.velocity.x -= knockbackForce * 0.25 * Math.cos(angle);
    this.velocity.y -= knockbackForce * 0.25 * Math.sin(angle);
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    
    // When damaged, counterattack with a single strike if cooldown allows
    if (entity && this.attackCooldown.finished) {
      this.attackCooldown.renew();
      this.performSingleAttack(entity);
    }

    if (this.health.isDead) {
      this.remove();
    }
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
    state.isAttacking = this.isAttacking;
    state.isPoisoning = this.poisonedTargets.size > 0;
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
    this.poisonDamage.reset();
    this.poisonedTargets.clear();
  }
}

module.exports = ScorpionMob;