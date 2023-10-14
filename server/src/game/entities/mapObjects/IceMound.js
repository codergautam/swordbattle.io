const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

class IceMound extends Entity {
  constructor(game, objectData) {
    super(game, Types.Entity.IceMound, objectData);

    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size);
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Speed, 'iceMound', { multiplier: 0.7 });
  }
}

module.exports = IceMound;
