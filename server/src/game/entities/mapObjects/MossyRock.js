const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const Types = require('../../Types');

class MossyRock extends Entity {
  static defaultDefinition = {
    forbiddenEntities: [Types.Entity.House1],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.MossyRock, objectData);

    this.shape = Polygon.createFromPoints(0, 0, [
      [0, 0],
      [this.size, -0.0361247947454844 * this.size],
      [0.7799671592775042 * this.size, -0.5221674876847291 * this.size],
      [0.2134646962233169 * this.size, -0.5221674876847291 * this.size],
    ]);
    this.density = 3;
    this.targets.push(...Types.Groups.Obstacles);

    this.spawn();
  }

  processTargetsCollision(entity, response) {
    if (entity.type === Types.Entity.Sword && !entity.canCollide(entity)) return;

    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    this.shape.applyCollision(selfMtv);
    entity.shape.applyCollision(targetMtv);
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = MossyRock;
