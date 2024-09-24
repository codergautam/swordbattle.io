const SAT = require("sat");
const Entity = require("../Entity");
const Circle = require("../../shapes/Circle");
const Timer = require("../../components/Timer");
const Health = require("../../components/Health");
const Property = require("../../components/Property");
const Types = require("../../Types");
const helpers = require("../../../helpers");

class YetiMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    size: 70,
    health: 25,
    regen: 2,
    speed: 35,
    damage: 2,
    bossDamage: 15,
    snowballCooldown: [0.2, 0.4],
    snowballDuration: [2, 3],
    snowballSpeed: 90,
    snowballSize: 80,
    attackRadius: 2000,
    density: 5,
    isBoss: false,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Yeti, definition);

    this.isGlobal = this.definition.isBoss;
    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = this.size * (this.definition.isBoss ? 100 : 10);
    this.density = 3;

    this.snowballTimer = new Timer(
      0,
      this.definition.snowballCooldown[0],
      this.definition.snowballCooldown[1]
    );
    this.movementTimer = new Timer(0, 3, 4);
    this.stayTimer = new Timer(3, 2, 3);
    this.isMoving = false;
    this.targetAngle = this.angle;
    this.startAngle = this.angle;

    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(this.definition.speed);
    this.damage = new Property(
      this.definition.isBoss
        ? this.definition.bossDamage
        : this.definition.damage
    );
    this.target = null;
    this.targets.push(Types.Entity.Player);

    this.knockbackResistance = new Property(5);

    this.spawn();
  }

  update(dt) {
    if (!this.target || this.target.removed) {
      this.target = null;
    }

    if (!this.target) {
      const searchRadius = this.definition.attackRadius;
      const searchZone = this.shape.boundary;
      searchZone.x -= searchRadius;
      searchZone.y -= searchRadius;
      searchZone.width += searchRadius;
      searchZone.height += searchRadius;

      const targets = this.game.entitiesQuadtree.get(searchZone);
      for (const { entity: target } of targets) {
        if (target === this) continue;
        if (target.type !== Types.Entity.Player) continue;

        const distance = helpers.distance(
          this.shape.x,
          this.shape.y,
          target.shape.x,
          target.shape.y
        );
        if (distance < searchRadius) {
          this.target = target;
          break;
        }
      }
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
              (this.movementTimer.progress * 3) *
              dt,
            this.speed.value *
              Math.sin(this.angle) *
              (this.movementTimer.progress * 3) *
              dt
          )
        );
      } else {
        this.angle = this.targetAngle;
        this.velocity.add(
          new SAT.Vector(
            this.speed.value * Math.cos(this.angle) * dt,
            this.speed.value * Math.sin(this.angle) * dt
          )
        );
      }
    }

    if (this.definition.isBoss) {
      this.snowballTimer.update(dt);
      if (this.snowballTimer.finished) {
        this.snowballTimer.renew();
        this.game.map.addEntity({
          type: Types.Entity.Snowball,
          size: this.definition.snowballSize,
          speed: this.definition.snowballSpeed,
          angle: this.angle,
          damage: this.damage.value,
          duration: [
            this.definition.snowballDuration[0],
            this.definition.snowballDuration[1],
          ],
          position: [this.shape.x, this.shape.y],
        });
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
      const knockback = force * 7;
      entity.velocity.x -=
        (knockback * Math.cos(this.angle - Math.PI)) /
        (entity.knockbackResistance.value || 1);
      entity.velocity.y -=
        (knockback * Math.sin(this.angle - Math.PI)) /
        (entity.knockbackResistance.value || 1);
      entity.damaged(force, this);
      this.velocity.scale(0);
    }
  }

  damaged(damage, entity) {
    this.health.damaged(damage);
    this.target = entity;
    if (this.movementTimer.finished) {
      this.movementTimer.renew();
    }
    this.isMoving = true;

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

module.exports = YetiMob;
