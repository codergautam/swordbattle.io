const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const Types = require('../../Types');

class LavaPool extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.LavaPool, objectData);

    this.isStatic = true;
    this.shape = Polygon.createFromPoints(0, 0, [
      [0, 0],
      [0.19753086419753085 * this.size, -0.09259259259259259 * this.size],
      [0.37962962962962965 * this.size, -0.09465020576131687 * this.size],
      [0.5339506172839507 * this.size, -0.043209876543209874 * this.size],
      [0.5843621399176955 * this.size, 0.030864197530864196 * this.size],
      [0.558641975308642 * this.size, 0.18621399176954734 * this.size],
      [0.3991769547325103 * this.size, 0.3148148148148148 * this.size],
      [0.0823045267489712 * this.size, 0.3446502057613169 * this.size],
      [-0.1337448559670782 * this.size, 0.40843621399176955 * this.size],
      [-0.2829218106995885 * this.size, 0.38477366255144035 * this.size],
      [-0.3816872427983539 * this.size, 0.29218106995884774 * this.size],
      [-0.4156378600823045 * this.size, 0.1831275720164609 * this.size],
      [-0.36522633744855965 * this.size, 0.056584362139917695 * this.size],
      [-0.2551440329218107 * this.size, -0.0102880658436214 * this.size],
      [-0.13991769547325103 * this.size, -0.03292181069958848 * this.size],
    ]);
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Speed, 'lavaPool', { multiplier: 0.8 });
    player.addEffect(Types.Effect.Burning, 'burning', { damage: Math.sqrt(this.size) / 2, entity: this });
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = LavaPool;
