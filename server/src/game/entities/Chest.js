const { Vector } = require('sat');
const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Types = require('../Types');
const helpers = require('../../helpers');

// size, coins, health
const rarities = [
  [200, 10, 10],
  [350, 15, 50],
  [500, 20, 300],
  [900, 35, 600],
  [1200, 50, 1000],
  [1700, 70, 1500],
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
    this.maxHealth = rarities[this.rarity][2];
    this.health = this.maxHealth;
    this.velocity = new Vector(0, 0);

    this.shape = Polygon.createFromRectangle(0, 0, this.size, this.size * 0.6);
    this.targets.push(Types.Entity.Sword);

    this.spawn();
  }

  update() {
    // Use velocity to restrict spawn outside biomes
    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    this.velocity.scale(0.9);
  }

  processTargetsCollision(sword) {
    if (!sword.canCollide(this)) return;

    sword.collidedEntities.add(this);
    this.health -= sword.damage.value;
    if (this.health <= 0) {
      this.health = 0;
      sword.player.flags.set(Types.Flags.ChestDestroy, true);

      for (let i = 0; i < this.coins; i++) {
        this.game.map.addEntity({
          type: Types.Entity.Coin,
          spawnZone: this.shape,
        });
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
    state.health = this.health;
    state.maxHealth = this.maxHealth;
    return state;
  }
}

module.exports = Chest;
