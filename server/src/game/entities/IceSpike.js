const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Types = require('../Types');

class IceSpike extends Entity {
  constructor(game, objectData) {
    super(game, Types.Entity.IceSpike, objectData);

    this.isStatic = true;
    this.shape = Polygon.createFromPoints(0, 0, [
      [0, 0],
      [0.16784869976359337 * this.size, -0.6619385342789598 * this.size],
      [0.22458628841607564 * this.size, -0.5862884160756501 * this.size],
      [0.5650118203309693 * this.size, -1.037825059101655 * this.size],
      [0.6713947990543735 * this.size, -0.5673758865248227 * this.size],
      [this.size, -0.7635933806146572 * this.size],
      [0.8416075650118203 * this.size, -0.0070921985815602835 * this.size],
    ]);
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Slipping, 'slipping', { duration: 0.5 });
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = IceSpike;
