const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Types = require('../Types');
const helpers = require('../../helpers');

class Token extends Entity {

  static defaultDefinition = {
    forbiddenEntities: [Types.Entity.IceSpike],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Token, objectData);
    if(typeof objectData.value === 'number') objectData.value = [objectData.value, objectData.value];
    objectData.value = Array.isArray(objectData.value) ? objectData.value : [1, 1];
    this.value = helpers.randomInteger(objectData.value[0], objectData.value[1]);
    // Tokens appear larger than coins (less spawn per mob)
    const radius = Math.min(250, 90 + this.value * 10);

    this.shape = Circle.create(0, 0, radius);
    this.targets.add(Types.Entity.Player);
    this.droppedBy = objectData.droppedBy;

    // Despawn token after 2 minutes
    this.despawnTime = Date.now() + (1000 * 60 * 2);

    this.spawn();
  }

  update() {
  if (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.y) > 0.01) {
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    this.velocity.scale(0.5);

    if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
  }

  if (Date.now() > this.despawnTime) {
    if(this.respawnable) this.createInstance();
    this.remove();
  }
}

  createState() {
    const state = super.createState();
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

    // Add tokens to player's token count (multiply like coins do)
    // Double tokens if player has bonusTokens modifier
    const tokenValue = player.modifiers?.bonusTokens ? this.value * 2 : this.value;
    player.levels.addTokens(tokenValue);

    player.flags.set(Types.Flags.GetToken, true);

    if (this.respawnable) this.createInstance();
    this.remove();
  }
}

module.exports = Token;
