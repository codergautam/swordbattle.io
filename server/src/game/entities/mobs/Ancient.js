const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class AncientMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    size: 100,
    health: 5,
    regen: 2,
    speed: 45,
    damage: 2,
    jumpCooldown: [0.5, 0.8],
    swordCooldown: [4.5, 6],
    swordDuration: [2, 3.5],
    swordCount: [3],
    swordSpeed: 60,
    swordSize: 80,
    boulderSize: 115,
    boulderSpeed: 50,
    boulderDuration: [2.25, 2.75],
    swordsSpread: Math.PI / 6,
    attackRadius: 250,
    rotationSpeed: 1,
    density: 5,
    isBoss: false,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Ancient, definition);

    this.isGlobal = this.definition.isBoss;
    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 25000;
    // this.tokensDrop = 1250;

    this.jumpTimer = new Timer(0, this.definition.jumpCooldown[0], this.definition.jumpCooldown[1]);
    this.angryTimer = new Timer(0, 7, 10);
    this.swordTimer = new Timer(0, this.definition.swordCooldown[0], this.definition.swordCooldown[1]);

    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(this.definition.speed);
    this.damage = new Property(this.definition.damage);

    this.knockbackResistance = new Property(5);
    this.target = null;
    this.targets.push(Types.Entity.Player);

    // Marked player can deal full damage but other players deal less damage
    this.markedPlayer = null;
    this.markTime = 0;

    this.spawn();
  }

  update(dt) {
    this.angryTimer.update(dt);
    if (this.angryTimer.finished || !this.target || this.target.removed) {
      this.target = null;
    }

    this.swordTimer.update(dt);
    this.health.update(dt);
    this.jumpTimer.update(dt);

    if (this.target) {
      const targetAngle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);

      this.speed.multiplier *= 1.5;

      this.angle = helpers.angleLerp(this.angle, targetAngle, dt * this.definition.rotationSpeed);
      if (this.swordTimer.finished) {
        this.swordTimer.renew();

        if (Math.random() < 0.5) {
          const swords = helpers.randomChoice(this.definition.swordCount);
          const spread = this.definition.swordsSpread;
          for (let i = 0; i < swords; i++) {
            this.game.map.addEntity({
              type: Types.Entity.SwordProj,
              size: this.definition.swordSize,
              speed: this.definition.swordSpeed,
              angle: this.angle - ((i - (swords - 1) / 2) * spread),
              damage: this.damage.value * 0.7,
              duration: [this.definition.swordDuration[0], this.definition.swordDuration[1]],
              position: [this.shape.x, this.shape.y],
            });
          }
        } else {
          this.game.map.addEntity({
            type: Types.Entity.Boulder,
            size: this.definition.boulderSize,
            speed: this.definition.boulderSpeed,
            angle: this.angle,
            damage: this.damage.value * 0.25,
            duration: [this.definition.boulderDuration[0], this.definition.boulderDuration[1]],
            position: [this.shape.x, this.shape.y],
          });
        }
      }
    }

    if (this.jumpTimer.finished) {
      this.jumpTimer.renew();
      if (!this.target) {
        this.angle += helpers.random(-Math.PI, Math.PI) / 2;
      }

      this.velocity.add(new SAT.Vector(
        this.speed.value * Math.cos(this.angle),
        this.speed.value * Math.sin(this.angle)));
    }

    this.velocity.scale(0.9);
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

    const angle = helpers.angle(this.shape.x, this.shape.y, entity.shape.x, entity.shape.y);
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
    if (this.removed) return;

    let finalDamage = damage;

    if (entity.modifiers?.mobPower) {
      finalDamage *= entity.modifiers.mobPower;
    }

    // Bots and shielded players always deal full damage
    const isBot = entity.isBot;
    const isShielded = entity.coins < 500;
    const bypassesMarkSystem = isBot || isShielded;

    if (!bypassesMarkSystem) {
      const currentTime = Date.now();
      const markDuration = 5000; // 5s

      if (!this.markedPlayer || (currentTime - this.markTime) >= markDuration) {
        // This player marked
        this.markedPlayer = entity;
        this.markTime = currentTime;
      }

      if (this.markedPlayer !== entity) {
        finalDamage *= 0.33; // 67% less dmg or 33% dmg
      }
    }

    this.health.damaged(finalDamage);
    this.target = entity;
    this.angryTimer.renew();

    if (this.health.isDead && !this.removed) {
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
    this.createInstance();
  }

  cleanup() {
    super.cleanup();
    this.speed.reset();
    this.damage.reset();
  }
}

module.exports = AncientMob;