const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

class DeadBush extends Entity {
  static defaultDefinition = {
    forbiddenEntities: [
      Types.Entity.House1,
      Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.IcePond,
      Types.Entity.OasisLake, Types.Entity.Cactus,
    ],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.DeadBush, objectData);
    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size);
    this.spawn();
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = DeadBush;
