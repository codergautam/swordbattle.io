const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Types = require('../Types');
const helpers = require('../../helpers');

class Coin extends Entity {

  static defaultDefinition = {
    forbiddenEntities: [Types.Entity.IceSpike],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Coin, objectData);
    if(typeof objectData.value === 'number') objectData.value = [objectData.value, objectData.value];
    objectData.value = Array.isArray(objectData.value) ? objectData.value : [1, 1];
    this.value = helpers.randomInteger(objectData.value[0], objectData.value[1]);
    const radius = Math.min(200, 70 + this.value * 7);

    this.shape = Circle.create(0, 0, radius);
    this.targets.push(Types.Entity.Player);
    this.droppedBy = objectData.droppedBy;

    // Despawn coin after 2 minutes
    this.despawnTime = Date.now() + (1000 * 60 * 2);

    this.spawn();
  }

  update() {
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    this.velocity.scale(0.5);

    if (Date.now() > this.despawnTime) {
      if(this.respawnable) this.createInstance();
      this.remove();
    }
  }

  createState() {
    const state = super.createState();
    // if (this.removed) {
    //   state.hunterId = this.hunterId;
    // }
    return state;
  }

  processTargetsCollision(player) {
    if(this.droppedBy && player.client?.account && player.client?.account?.id == this.droppedBy) {
      // bounce off the player
      const dx = player.shape.x - this.shape.x;
      const dy = player.shape.y - this.shape.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const overlap = (this.shape.radius*0.8) + player.shape.radius - distance;
      if (overlap > 0) {
        const angle = Math.atan2(dy, dx);
        this.velocity.x -= Math.cos(angle) * overlap;
        this.velocity.y -= Math.sin(angle) * overlap;
      }
      return;
    }
    player.levels.addCoins(this.value);
    player.flags.set(Types.Flags.GetCoin, true);

    if (this.respawnable) this.createInstance();
    this.remove();
  }
}

module.exports = Coin;
