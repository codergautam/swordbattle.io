const Property = require('../components/Property');
const Timer = require('../components/Timer');
const Circle = require('../shapes/Circle');
const Entity = require('./Entity');
const Types = require('../Types');

class ThrownSword extends Entity {
  constructor(game, config) {
    super(game, Types.Entity.ThrownSword);

    this.owner = config.owner || null;
    this.size = config.size || 50;
    this.angle = config.angle || 0;
    this.skin = config.skin || 0;
    this.speed = new Property(config.speed || 95);
    this.damage = new Property(config.damage || 10);
    this.knockbackPower = config.knockback || 150;
    this.duration = new Timer(0, config.duration || 1.5, config.duration || 1.5);

    this.shape = Circle.create(config.x || 0, config.y || 0, Math.max(this.size * 0.4, 25));
    this.targets.add(Types.Entity.Player);
    for (const t of Types.Groups.Mobs) this.targets.add(t);
    this.targets.add(Types.Entity.Chest);

    this.collidedEntities = new Set();
    this.duration.renew();
  }

  update(dt) {
    this.shape.x += this.speed.value * Math.cos(this.angle);
    this.shape.y += this.speed.value * Math.sin(this.angle);

    this.duration.update(dt);
    if (this.duration.finished) {
      this.remove();
    }
  }

  processTargetsCollision(entity, response) {
    if (entity.depth !== this.depth) return;
    if (this.owner && entity === this.owner) return;
    if (this.collidedEntities.has(entity)) return;
    if (entity.cards && entity.cards.choosingCard) return;

    this.collidedEntities.add(entity);

    const angle = Math.atan2(entity.shape.y - this.shape.y, entity.shape.x - this.shape.x);
    const power = this.knockbackPower / (entity.knockbackResistance?.value || 1);
    entity.velocity.x += power * Math.cos(angle);
    entity.velocity.y += power * Math.sin(angle);

    let dmg = this.damage.value;

    if (this.owner && this.owner.cards) {
      dmg *= this.owner.cards.onHitEntity(entity, dmg, true);
      dmg *= this.owner.cards.getDamageDealtMultiplier(entity);
    }

    if (typeof entity.damaged === 'function') {
      entity.damaged(dmg, this.owner || this, true);
    }

    if (entity.type === Types.Entity.Player && entity.flags) {
      entity.flags.set(Types.Flags.Damaged, entity.id);
    }
    if (this.owner && this.owner.flags) {
      this.owner.flags.set(Types.Flags.EnemyHit, entity.id);
    }
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
    state.size = this.size;
    state.skin = this.skin;
    return state;
  }
}

module.exports = ThrownSword;
