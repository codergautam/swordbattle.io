const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Timer = require('../components/Timer');
const Types = require('../Types');

class BishopBolt extends Entity {
  constructor(game, owner, angle, options = {}) {
    super(game, Types.Entity.BishopBolt, { size: options.size || 24 });
    this.owner = owner;
    this.angle = angle;
    this.speed = options.speed || 1800;
    this.damage = options.damage || 4;
    this.knockback = options.knockback || 95;
    this.shape = Circle.create(
      owner.shape.x + Math.cos(angle) * owner.shape.radius * 1.15,
      owner.shape.y + Math.sin(angle) * owner.shape.radius * 1.15,
      this.size,
    );
    this.depth = owner.depth;
    this.velocity.x = Math.cos(angle) * this.speed;
    this.velocity.y = Math.sin(angle) * this.speed;
    this.duration = new Timer(0, options.duration || 1.35, options.duration || 1.35);
    this.targets.add(Types.Entity.Player);
    for (const type of Types.Groups.Mobs) this.targets.add(type);
  }

  isFriendly(entity) {
    return entity === this.owner || (this.owner.botTeamId !== null
      && this.owner.botTeamId !== undefined
      && entity.botTeamId === this.owner.botTeamId);
  }

  update(dt) {
    this.shape.x += this.velocity.x * dt;
    this.shape.y += this.velocity.y * dt;
    this.duration.update(dt);
    if (this.duration.finished) this.remove();
  }

  processTargetsCollision(entity) {
    if (this.owner?.modifiers?.attackLocked || entity.modifiers?.phaseImmune) return;
    if (entity.depth !== this.depth || this.isFriendly(entity)) return;
    if (entity.inSafezone || entity.cards?.isTutorial) return;
    if (typeof entity.damaged === 'function') {
      entity.damaged(this.damage, this.owner, true);
      if (entity.velocity) {
        entity.velocity.x += Math.cos(this.angle) * this.knockback;
        entity.velocity.y += Math.sin(this.angle) * this.knockback;
      }
    }
    this.remove();
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
    return state;
  }
}

module.exports = BishopBolt;
