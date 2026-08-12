const SAT = require('sat');
const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Timer = require('../../components/Timer');
const Health = require('../../components/Health');
const Property = require('../../components/Property');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class Stormray extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone, Types.Biome.Earth,
      Types.Biome.Fire, Types.Biome.Ice, Types.Biome.Meadow, Types.Biome.Savanna,
      Types.Biome.Alpine, Types.Biome.Dirt, Types.Biome.Rocks, Types.Biome.Desert,
      Types.Biome.Oasis],
    attackRadius: 1550,
    size: 105,
    health: 95,
    regen: 3,
    speed: 28,
    damage: 13,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Stormray, definition);
    this.shape = Circle.create(0, 0, this.size);
    this.angle = helpers.random(-Math.PI, Math.PI);
    this.health = new Health(this.definition.health, this.definition.regen);
    this.speed = new Property(this.definition.speed);
    this.damage = new Property(this.definition.damage);
    this.knockbackResistance = new Property(5);
    this.coinsDrop = 900;
    this.target = null;
    this.targets.add(Types.Entity.Player);
    this.thinkTimer = new Timer(0, 0.28, 0.38);
    this.diveTimer = new Timer(0, 2.1, 3.1);
    this.attackTimer = new Timer(0, 0.75, 0.95);
    this.orbitDirection = Math.random() < 0.5 ? -1 : 1;
    this.diving = false;
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
    this.diveTimer.update(dt);
    this.attackTimer.update(dt);
    if (this.thinkTimer.finished) {
      this.thinkTimer.renew();
      this.chooseTarget();
    }

    if (this.target) {
      const toward = helpers.angle(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      const distance = helpers.distance(this.shape.x, this.shape.y, this.target.shape.x, this.target.shape.y);
      if (this.diveTimer.finished) {
        this.diveTimer.renew();
        this.diving = true;
        this.angle = toward;
        this.velocity.add(new SAT.Vector(Math.cos(toward) * 150, Math.sin(toward) * 150));
      } else {
        if (distance < 360) this.diving = false;
        this.angle = this.diving ? toward : toward + this.orbitDirection * Math.PI / 2.6;
        const force = this.speed.value * (this.diving ? 1.8 : 0.85);
        this.velocity.add(new SAT.Vector(Math.cos(this.angle) * force, Math.sin(this.angle) * force));
      }
    } else {
      if (Math.random() < dt * 0.6) this.angle += helpers.random(-0.55, 0.55);
      this.velocity.add(new SAT.Vector(Math.cos(this.angle) * 1.8, Math.sin(this.angle) * 1.8));
    }

    this.velocity.scale(0.91);
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
    entity.velocity.x += Math.cos(angle) * 125;
    entity.velocity.y += Math.sin(angle) * 125;
    this.diving = false;
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
    state.diving = this.diving;
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

module.exports = Stormray;
