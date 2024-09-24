const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

class Bush extends Entity {
  static defaultDefinition = {
    forbiddenEntities: [Types.Entity.House1],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Bush, objectData);

    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size);
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Speed, 'bush', { multiplier: 1.1 });
  }
}

module.exports = Bush;
