const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class Whirlpool extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone],
    forbiddenEntities: [Types.Entity.Whirlpool],
    spawnBuffer: 320,
    size: 260,
  };

  constructor(game, definition) {
    super(game, Types.Entity.Whirlpool, definition);
    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size);
    this.targets.add(Types.Entity.Player);
    this.damageClock = new Map();
    this.spawn();
  }

  processTargetsCollision(player, response, dt) {
    player.addEffect(Types.Effect.Speed, `whirlpool:${this.id}`, { multiplier: 0.62 });
    const angle = helpers.angle(player.shape.x, player.shape.y, this.shape.x, this.shape.y);
    const pull = Math.min(14, 4 + this.size / 45) * Math.max(0.25, dt * 20);
    player.velocity.x += Math.cos(angle) * pull;
    player.velocity.y += Math.sin(angle) * pull;

    const elapsed = (this.damageClock.get(player.id) || 0) + dt;
    if (elapsed >= 0.75) {
      this.damageClock.set(player.id, elapsed - 0.75);
      player.damaged(4 + Math.sqrt(this.size) * 0.18, this);
    } else {
      this.damageClock.set(player.id, elapsed);
    }
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = Whirlpool;
