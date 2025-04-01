const { Vector } = require('sat');
const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Health = require('../components/Health');
const Types = require('../Types');
const helpers = require('../../helpers');

// size, coins, health, weight
const rarities = [
  [200, 50, 1, 75],
  [2200, 20000, 1600, 0.5],
  [400, 250, 70, 6],
  [750, 750, 100, 4],
  [1050, 2000, 230, 3],
  [1500, 6000, 600, 1.5],
];

let totalWeight = rarities.reduce((acc, rarity) => acc + rarity[3], 0);

class Chest extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.River],
    forbiddenEntities: [Types.Entity.IceSpike],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Chest, objectData);

    let rand = helpers.randomInteger(0, totalWeight - 1);
   // this.rarity = rarities.findIndex(rarity => {
   //   rand -= rarity[3];
   //   return rand < 0;
   // });
    this.rarity = 1;
    this.size = Math.floor(Math.random() * (1350 - 200 + 1)) + 200;
    this.coins = this.size * (Math.floor(Math.random() * 7.5) + 1);
    this.health = new Health(this.size * (Math.random() * (1.1 - 0.3) + 0.3), 0);

    this.shape = Polygon.createFromRectangle(0, 0, this.size, this.size * 0.6);
    this.targets.push(Types.Entity.Sword);

    // Despawn coin after 20 minutes
    this.despawnTime = Date.now() + (1000 * 60 * 20);

    this.spawn();
  }

  update() {
    if (Date.now() > this.despawnTime) {
      if(this.respawnable) this.createInstance();
      this.remove();
    }
  }

  processTargetsCollision(sword) {
    if (!sword.canCollide(this)) return;

    sword.collidedEntities.add(this);
    this.health.damaged(sword.damage.value);
    if (this.health.isDead) {
      sword.player.flags.set(Types.Flags.ChestDestroy, true);

      this.game.map.spawnCoinsInShape(this.shape, this.coins);

      if (this.respawnable) this.createInstance();
      this.remove();
    } else {
      sword.player.flags.set(Types.Flags.ChestHit, true);
    }
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.rarity = this.rarity;
    return state;
  }
}

module.exports = Chest;
