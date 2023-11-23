const { Vector } = require('sat');
const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Health = require('../components/Health');
const Types = require('../Types');
const helpers = require('../../helpers');

// size, coins, health
const rarities = [
  [200, 100, 1],
  [350, 200, 50],
  [500, 500, 300],
  [900, 1000, 600],
  [1200, 3000, 1000],
  [1700, 10000, 1500],
];

class Chest extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.River],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Chest, objectData);

    this.rarity = helpers.randomInteger(0, rarities.length - 1);
    this.size = rarities[this.rarity][0];
    this.coins = rarities[this.rarity][1];
    this.health = new Health(rarities[this.rarity][2], 0);

    this.shape = Polygon.createFromRectangle(0, 0, this.size, this.size * 0.6);
    this.targets.push(Types.Entity.Sword);

    this.spawn();
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
