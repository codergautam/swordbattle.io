const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class Tideclaw extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone, Types.Biome.River],
    attackRadius: 1250,
    size: 88,
    health: 72,
    regen: 2,
    speed: 34,
    damage: 10,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Tideclaw, definition);
    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(this.definition.speed);
    this.damage = new Property(this.definition.damage);
    this.knockbackResistance = new Property(8);
    this.coinsDrop = 650;
    this.target = null;
    this.targets.add(Types.Entity.Player);
    this.thinkTimer = new Timer(0, 0.22, 0.32);
    this.attackTimer = new Timer(0, 0.8, 1.05);
    this.scuttleDirection = Math.random() < 0.5 ? -1 : 1;
    this.spawn();
  }

  chooseTarget() {
    let nearest = null;
    let nearestDistance = this.definition.attackRadius;
    for (const player of this.game.players) {
      if (!player || player.removed || this.targetInForbiddenBiome(player)) continue;
      const distance = helpers.distance(this.shape.x, this.shape.y, player.shape.x, player.shape.y);
      if (distance < nearestDistance) {
        nearest = player;
        nearestDistance = distance;
      }
    }
    this.target = nearest;
  }

  update(dt) {
    this.health.update(dt);
    this.thinkTimer.update(dt);
    this.attackTimer.update(dt);
    if (this.thinkTimer.finished) {
      this.thinkTimer.renew();
      this.chooseTarget();
      if (Math.random() < 0.18) this.scuttleDirection *= -1;
    }

    if (this.target) {
      const toward = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      const strafe = distance < 420 ? this.scuttleDirection * Math.PI / 2.35 : 0;
      this.angle = toward + strafe;
      const burst = distance > 650 ? 1.45 : 1;
      this.velocity.add(new SAT.Vector(
        this.speed.value * burst * Math.cos(this.angle),
        this.speed.value * burst * Math.sin(this.angle),
      ));
    } else {
      if (Math.random() < dt * 0.7) this.angle += helpers.random(-0.8, 0.8);
      this.velocity.add(new SAT.Vector(
        this.speed.value * 0.08 * Math.cos(this.angle),
        this.speed.value * 0.08 * Math.sin(this.angle),
      ));
    }

    this.velocity.scale(0.88);
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
  }

  processTargetsCollision(entity, response) {
    const mtv = this.shape.getCollisionOverlap(response);
    this.shape.applyCollision(mtv);
    if (entity.id !== this.target?.id || !this.attackTimer.finished) return;
    this.attackTimer.renew();
    entity.damaged(this.damage.value, this);
    const angle = helpers.angle(this.shape.x, this.shape.y, entity.shape.x, entity.shape.y);
    entity.velocity.x += Math.cos(angle) * 95;
    entity.velocity.y += Math.sin(angle) * 95;
  }

  damaged(damage, entity) {
    if (this.removed) return;
    this.health.damaged(damage * (entity.modifiers?.mobPower || 1));
    if (!(entity.type === Types.Entity.Player && entity.cards?.hasMajor(126))) this.target = entity;
    if (this.health.isDead) this.remove();
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
    this.createInstance();
  }

  cleanup() {
    super.cleanup();
    this.speed.reset();
    this.damage.reset();
  }
}

module.exports = Tideclaw;
