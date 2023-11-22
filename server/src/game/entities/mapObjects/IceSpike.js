const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const Types = require('../../Types');

class IceSpike extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    forbiddenEntities: [Types.Entity.House1],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.IceSpike, objectData);

    this.isStatic = true;
    this.shape = Polygon.createFromPoints(0, 0, [
      [0 * this.size, 0 * this.size],
      [0.8409638554216867 * this.size, 0 * this.size],
      [1 * this.size, -0.7518072289156627 * this.size],
      [0.6987951807228916 * this.size, -0.6313253012048192 * this.size],
      [0.5325301204819277 * this.size, -0.9927710843373494 * this.size],
      [0.15421686746987953 * this.size, -0.5662650602409639 * this.size],
    ]);
    this.targets.push(...Types.Groups.Obstacles);

    this.spawn();
  }

  processTargetsCollision(player, response) {
    const mtv = this.shape.getCollisionOverlap(response);
    player.shape.applyCollision(mtv);
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = IceSpike;
