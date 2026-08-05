const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class SphinxMob extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone, Types.Biome.River],
    size: 220,
    health: 850,
    regen: 2,
    speed: 32,
    damage: 6,
    jumpCooldown: [1.4, 2.2],
    sandBlockCooldown: [1.6, 2.4],
    sandBlockSize: 55,
    sandBlockSpeed: 38,
    sandBlockDuration: [3, 5],
    sandBallSize: 35,
    sandBallSpeed: 35,
    sandBallDuration: [3, 5],
    rotationSpeed: 1.2,
    density: 5,
    isBoss: false,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Sphinx, definition);

    this.isGlobal = this.definition.isBoss;
    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.coinsDrop = 50000;

    this.jumpTimer = new Timer(0, this.definition.jumpCooldown[0], this.definition.jumpCooldown[1]);
    this.attackTimer = new Timer(0, this.definition.sandBlockCooldown[0], this.definition.sandBlockCooldown[1]);
    this.angryTimer = new Timer(0, 7, 10);

    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(this.definition.speed);
    this.damage = new Property(this.definition.damage);
    this.knockbackResistance = new Property(8);

    this.target = null;
    this.targets.add(Types.Entity.Player);

    this.attacksSinceUltimate = 0;
    this.ultimateEvery = helpers.randomInteger(3, 5);
    this.ultimate = null;

    this.spawn();
  }

  update(dt) {
    this.angryTimer.update(dt);
    if (this.angryTimer.finished || !this.target || this.target.removed || this.targetInForbiddenBiome(this.target)) {
      this.target = null;
      this.ultimate = null;
    }

    this.health.update(dt);
    this.jumpTimer.update(dt);
    this.attackTimer.update(dt);

    if (this.ultimate) {
      this.ultimate.sinceLast += dt;
      while (this.ultimate.sinceLast >= this.ultimate.fireEvery && this.ultimate.remaining > 0) {
        this.ultimate.sinceLast -= this.ultimate.fireEvery;
        const i = this.ultimate.totalCount - this.ultimate.remaining;
        const a = this.ultimate.baseAngle + (i / this.ultimate.totalCount) * Math.PI * 2;
        const r = this.size + this.definition.sandBallSize / 2;
        this.game.map.addEntity({
          type: Types.Entity.SandBall,
          size: this.definition.sandBallSize,
          speed: this.definition.sandBallSpeed,
          angle: a,
          damage: this.damage.value,
          duration: this.definition.sandBallDuration,
          position: [this.shape.x + r * Math.cos(a), this.shape.y + r * Math.sin(a)],
        });
        this.ultimate.remaining--;
      }
      if (this.ultimate.remaining <= 0) this.ultimate = null;
    }

    if (this.target) {
      const targetAngle = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      this.angle = helpers.angleLerp(this.angle, targetAngle, dt * this.definition.rotationSpeed);

      if (this.attackTimer.finished && !this.ultimate) {
        this.attackTimer.renew();
        this.attacksSinceUltimate++;

        if (this.attacksSinceUltimate >= this.ultimateEvery) {
          this.attacksSinceUltimate = 0;
          this.ultimateEvery = helpers.randomInteger(3, 5);
          const totalCount = helpers.randomInteger(20, 30);
          this.ultimate = {
            remaining: totalCount,
            totalCount,
            fireEvery: 0.12,
            sinceLast: 0,
            baseAngle: helpers.random(0, Math.PI * 2),
          };
        } else if (Math.random() < 0.5) {
          const count = Math.random() < 0.5 ? 4 : 8;
          const step = (Math.PI * 2) / count;
          const base = this.angle;
          const r = this.size + this.definition.sandBlockSize / 2;
          for (let i = 0; i < count; i++) {
            const a = base + i * step;
            this.game.map.addEntity({
              type: Types.Entity.SandBlock,
              size: this.definition.sandBlockSize,
              speed: this.definition.sandBlockSpeed,
              angle: a,
              damage: this.damage.value,
              duration: this.definition.sandBlockDuration,
              position: [this.shape.x + r * Math.cos(a), this.shape.y + r * Math.sin(a)],
            });
          }
        } else {
          const r = this.size + this.definition.sandBlockSize / 2;
          this.game.map.addEntity({
            type: Types.Entity.SandBlock,
            size: this.definition.sandBlockSize,
            speed: this.definition.sandBlockSpeed,
            angle: this.angle,
            damage: this.damage.value,
            duration: this.definition.sandBlockDuration,
            position: [this.shape.x + r * Math.cos(this.angle), this.shape.y + r * Math.sin(this.angle)],
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
  }

  damaged(damage, entity) {
    if (this.removed) return;
    this.health.damaged(damage);
    if (entity && !(entity.type === Types.Entity.Player && entity.cards && entity.cards.hasMajor && entity.cards.hasMajor(126))) {
      this.target = entity;
      this.angryTimer.renew();
    }
    if (this.health.isDead) this.remove();
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
    return state;
  }

  remove() {
    if (this.removed) return;
    super.remove();
    this.game.map.spawnCoinsInShape(this.shape, this.coinsDrop);
    this.createInstance();
  }
}

module.exports = SphinxMob;
