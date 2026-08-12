const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class WolfMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    attackRadius: 1000,
  };

  constructor(game, objectData) {
    objectData = Object.assign({ size: 70 }, objectData);
    super(game, Types.Entity.Wolf, objectData);

    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 750;
    // this.tokensDrop = 100;

    this.tamedBy = null;
    this.packId = objectData.packId ?? null;
    this.flockRadius = 900;
    this.separationRadius = 230;

    this.jumpTimer = new Timer(0, 2, 3);
    this.angryTimer = new Timer(0, 12, 21);
    this.attackTimer = new Timer(0, 0.5, 0.5);

    this.health = new Health(75, 1);
    this.speed = new Property(22);
    this.damage = new Property(12);
    this.target = null;
    this.targets.add(Types.Entity.Player);

    this.knockbackResistance = new Property(3);

    this.spawn();
  }

  update(dt) {
    this.angryTimer.update(dt);
    this.attackTimer.update(dt);
    if (this.angryTimer.finished || !this.target || this.target.removed || this.targetInForbiddenBiome(this.target)) {
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
    this.jumpTimer.update(this.target ? dt * 3 : dt);

    if (this.jumpTimer.finished) {
      this.jumpTimer.renew();

      if (this.target) {
        const angle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
        this.angle = angle;
      } else {
        this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      }
    }

    this.applyBoidMovement(dt);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
  }

  packmates() {
    if (this.packId === null || !this.game.entitiesQuadtree) return [];
    const r = this.flockRadius;
    const nearby = this.game.entitiesQuadtree.get({
      x: this.shape.x - r, y: this.shape.y - r, width: r * 2, height: r * 2,
    });
    const result = [];
    for (const record of nearby) {
      const wolf = record.entity;
      if (!wolf || wolf === this || wolf.removed || wolf.type !== Types.Entity.Wolf) continue;
      if (wolf.packId === this.packId) result.push(wolf);
    }
    return result;
  }

  applyBoidMovement(dt) {
    const mates = this.packmates();
    let desiredX = Math.cos(this.angle);
    let desiredY = Math.sin(this.angle);
    let separationX = 0, separationY = 0;
    let alignmentX = 0, alignmentY = 0;
    let centerX = 0, centerY = 0;

    for (const mate of mates) {
      if (!this.target && mate.target && !mate.target.removed) this.target = mate.target;
      const dx = mate.shape.x - this.shape.x;
      const dy = mate.shape.y - this.shape.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (distance < this.separationRadius) {
        const weight = (this.separationRadius - distance) / this.separationRadius;
        separationX -= dx / distance * weight;
        separationY -= dy / distance * weight;
      }
      const mateSpeed = Math.hypot(mate.velocity.x, mate.velocity.y);
      if (mateSpeed > 0.01) {
        alignmentX += mate.velocity.x / mateSpeed;
        alignmentY += mate.velocity.y / mateSpeed;
      }
      centerX += mate.shape.x;
      centerY += mate.shape.y;
    }

    if (this.target && !this.target.removed) {
      const targetAngle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      desiredX = Math.cos(targetAngle) * 1.8;
      desiredY = Math.sin(targetAngle) * 1.8;
    }

    if (mates.length) {
      alignmentX /= mates.length;
      alignmentY /= mates.length;
      centerX = centerX / mates.length - this.shape.x;
      centerY = centerY / mates.length - this.shape.y;
      const centerDistance = Math.max(1, Math.hypot(centerX, centerY));
      desiredX += alignmentX * 0.7 + centerX / centerDistance * 0.65 + separationX * 2.4;
      desiredY += alignmentY * 0.7 + centerY / centerDistance * 0.65 + separationY * 2.4;
    }

    const desiredMagnitude = Math.max(0.001, Math.hypot(desiredX, desiredY));
    this.angle = Math.atan2(desiredY, desiredX);
    const movementSpeed = this.speed.value * (this.target ? 2 : 1);
    const targetVelocityX = desiredX / desiredMagnitude * movementSpeed;
    const targetVelocityY = desiredY / desiredMagnitude * movementSpeed;
    const steer = helpers.clamp(dt * 3.5, 0, 1);
    this.velocity.x += (targetVelocityX - this.velocity.x) * steer;
    this.velocity.y += (targetVelocityY - this.velocity.y) * steer;
    this.velocity.scale(0.93);
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    const angle = helpers.angle(this.shape.x, this.shape.y, entity.shape.x, entity.shape.y);
    if (this.target && entity.id === this.target.id) {
      const willAttack = this.attackTimer.finished;
      if (willAttack) this.attackTimer.renew();

      this.velocity.scale(-0.5);
      const kbX = 75 * Math.cos(angle);
      const kbY = 75 * Math.sin(angle);
      entity.velocity.x += kbX;
      entity.velocity.y += kbY;
      if (willAttack) entity.damaged(this.damage.value, this);

      this.shape.applyCollision(mtv);
      entity.shape.applyCollision(mtv.clone().scale(-1));
    } else {
      entity.shape.applyCollision(targetMtv);
      this.shape.applyCollision(selfMtv);
    }
  }

  damaged(damage, entity) {
    if (this.removed) return;
    if (entity.modifiers?.mobPower) {
      this.health.damaged(damage * entity.modifiers.mobPower);
    } else {
      this.health.damaged(damage);
    }
    if(this.tamedBy !== entity.id) {
    // Butcherer card: mobs don't aggro
    if (!(entity.type === 1 && entity.cards && entity.cards.hasMajor(126))) {
      this.target = entity;
    }
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
    if (this.removed) return;
    super.remove();
    this.game.map.spawnCoinsInShape(this.shape, this.coinsDrop);
    // this.game.map.spawnTokensInShape(this.shape, this.tokensDrop);
    if(this.tamedBy) {
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
