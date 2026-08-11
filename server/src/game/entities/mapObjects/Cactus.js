const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

class Cactus extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone, Types.Biome.River],
    forbiddenEntities: [
      Types.Entity.House1, Types.Entity.Chest,
      Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.IcePond,
      Types.Entity.OasisLake, Types.Entity.Cactus,
    ],
    spawnBuffer: 100,
    damage: 9,
    knockback: 220,
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Cactus, objectData);
    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size * 0.55);
    for (const t of Types.Groups.Obstacles) this.targets.add(t);
    this.hitCooldownMs = 500;
    this.lastHitByPlayerId = new Map();
    this.spawn();
  }

  processTargetsCollision(entity, response) {
    if (entity.modifiers?.phaseImmune) return;
    if (entity.modifiers?.dashNoclip) return;
    const eCenter = (entity.shape.center && typeof entity.shape.center === 'object')
      ? entity.shape.center
      : { x: entity.shape.x, y: entity.shape.y };
    let dx = eCenter.x - this.shape.x;
    let dy = eCenter.y - this.shape.y;
    let len = Math.hypot(dx, dy);
    if (len < 0.001) {
      const a = Math.random() * Math.PI * 2;
      dx = Math.cos(a); dy = Math.sin(a); len = 1;
    }
    const nx = dx / len;
    const ny = dy / len;
    let entityR;
    if (entity.shape.radius != null) {
      entityR = entity.shape.radius;
    } else {
      const b = entity.shape.boundary;
      entityR = b ? Math.max(b.width, b.height) / 2 : 0;
    }
    const targetDist = this.shape.radius + entityR + 2;
    if (len < targetDist) {
      const dxOut = (this.shape.x + nx * targetDist) - eCenter.x;
      const dyOut = (this.shape.y + ny * targetDist) - eCenter.y;
      entity.shape.x += dxOut;
      entity.shape.y += dyOut;
    }

    const vDotN = entity.velocity.x * nx + entity.velocity.y * ny;
    if (vDotN < 0) {
      entity.velocity.x -= vDotN * nx;
      entity.velocity.y -= vDotN * ny;
    }

    if (entity.type !== Types.Entity.Player) return;

    const now = Date.now();
    const last = this.lastHitByPlayerId.get(entity.id) || 0;
    if (now - last < this.hitCooldownMs) return;
    this.lastHitByPlayerId.set(entity.id, now);

    if (typeof entity.damaged === 'function') {
      entity.damaged(this.definition.damage, this);
    }
    try { entity.flags.set(Types.Flags.CactusHit, entity.id); } catch (e) {}

    const resist = (entity.knockbackResistance && entity.knockbackResistance.value) || 1;
    const k = this.definition.knockback / resist;
    entity.velocity.x += nx * k;
    entity.velocity.y += ny * k;
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = Cactus;
