const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

class OasisLake extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone, Types.Biome.River],
    forbiddenEntities: [
      Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.IcePond,
      Types.Entity.OasisLake, Types.Entity.Cactus,
    ],
    spawnBuffer: 200,
  };

  constructor(game, objectData) {
    super(game, Types.Entity.OasisLake, objectData);

    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size * 0.6);
    this.targets.add(Types.Entity.Player);

    this.spawn();
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Speed, 'oasisLake', { multiplier: 0.75 });
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = OasisLake;
