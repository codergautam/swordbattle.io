const { Vector } = require('sat');
const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Health = require('../components/Health');
const Types = require('../Types');
const helpers = require('../../helpers');

// size, coins, health, weight
const rarities = [
  [200, 50, 1, 68],  // Normal chest
  [350, 150, 40, 13], // Green chest
  [600, 350, 85, 8], // Red
  [800, 1000, 175, 5], // Blue
  [1200, 2500, 400, 3], // Yellow
  [1600, 6500, 750, 2], // Purple
  [1750, 12500, 1250, 1], // Silver
  [1850, 15000, 1000, 0], // Black chest (not in use)
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
    this.rarity = rarities.findIndex(rarity => {
      rand -= rarity[3];
      return rand < 0;
    });

    this.size = rarities[this.rarity][0];
    this.coins = rarities[this.rarity][1];
    this.health = new Health(rarities[this.rarity][2], 0);

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
    if (sword.player.modifiers.chestPower) {
      this.health.damaged(sword.damage.value * sword.player.modifiers.chestPower);
    } else {
      this.health.damaged(sword.damage.value);
    }
    if (this.health.isDead) {
      sword.player.flags.set(Types.Flags.ChestDestroy, true);

      if (sword.player.modifiers.chestPower) {
        this.game.map.spawnCoinsInShape(this.shape, this.coins);
      } else {
        this.game.map.spawnCoinsInShape(this.shape, this.coins);
      }

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
