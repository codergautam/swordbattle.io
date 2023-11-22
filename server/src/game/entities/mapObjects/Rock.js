const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const Types = require('../../Types');
const helpers = require('../../../helpers');

class Rock extends Entity {
  constructor(game, definition) {
    super(game, Types.Entity.Rock, definition);

    this.shape = Polygon.createFromPoints(0, 0, [
      [0, 0],
      [0.6538812785388128 * this.size, -0.011872146118721462 * this.size],
      [0.8602739726027397 * this.size, 0.30319634703196346 * this.size],
      [-0.09771689497716896 * this.size, 0.3817351598173516 * this.size],
      [-0.13972602739726028 * this.size, 0.28401826484018267 * this.size],
    ]);
    this.shape.angle = helpers.random(-Math.PI, Math.PI);
    this.density = 5;
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

module.exports = Rock;
