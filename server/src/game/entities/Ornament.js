const Property = require('../components/Property');
const Circle = require('../shapes/Circle');
const Entity = require('./Entity');
const Types = require('../Types');

class Ornament extends Entity {
  static defaultDefinition = {
    size: 90,
    damage: 8,
    orbitRadius: 120,
    knockbackMultiplier: 400,
    ornamentIndex: 0,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Ornament, definition);

    this.shape = Circle.create(0, 0, this.size);
    this.damage = new Property(this.definition.damage);
    this.knockbackMultiplier = new Property(this.definition.knockbackMultiplier);
    this.baseOrbitDistance = this.definition.orbitRadius;
    this.ornamentIndex = this.definition.ornamentIndex;
    this.angle = this.definition.angle || 0;
    this.owner = this.definition.owner;

    this.targets.push(Types.Entity.Player);
    this.collidedPlayers = new Set();
  }

  update(dt) {
    if (!this.owner || this.owner.removed) {
      this.remove();
      return;
    }

    const currentOrbitRadius = this.owner.shape.radius + this.baseOrbitDistance;

    this.shape.x = this.owner.shape.x + Math.cos(this.angle) * currentOrbitRadius;
    this.shape.y = this.owner.shape.y + Math.sin(this.angle) * currentOrbitRadius;

    if (Math.random() < 0.1) {
      this.collidedPlayers.clear();
    }
  }

  processTargetsCollision(entity, response) {
    if (entity === this.owner) return;

    if (entity.type !== Types.Entity.Player) return;

    if (this.collidedPlayers.has(entity.id)) return;
    this.collidedPlayers.add(entity.id);

    entity.damaged(this.damage.value, this.owner);

    const dx = entity.shape.x - this.shape.x;
    const dy = entity.shape.y - this.shape.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const knockbackForce = this.knockbackMultiplier.value / (entity.knockbackResistance.value || 1);
    entity.velocity.x += (dx / dist) * knockbackForce;
    entity.velocity.y += (dy / dist) * knockbackForce;
  }

  createState() {
    const state = super.createState();
    state.angle = this.angle;
    state.ornamentIndex = this.ornamentIndex;
    return state;
  }
}

module.exports = Ornament;
