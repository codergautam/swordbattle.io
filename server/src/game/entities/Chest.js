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

const chestBaseMult = 0.67;
const zoneTarget = { good: 1.2, great: 1.6, perfect: 2.0 };
const barMissMult = 0.9;
const tierFactor = { 3: 1.25, 4: 1.0, 5: 0.65, 6: 0.5, 7: 0.4 };

class Chest extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.River, Types.Biome.Safezone, Types.Biome.TutorialZone],
    forbiddenEntities: [Types.Entity.IceSpike, Types.Entity.Chest, Types.Entity.IcePond, Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.Cactus, Types.Entity.OasisLake],
    spawnBuffer: 150,
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Chest, objectData);

    const maxRarity = objectData.maxRarity !== undefined ? objectData.maxRarity : rarities.length - 1;
    const customWeights = objectData.rarityWeights;
    let filteredWeight = 0;
    for (let i = 0; i <= maxRarity && i < rarities.length; i++) {
      filteredWeight += (customWeights ? customWeights[i] || 0 : rarities[i][3]);
    }
    let rand = helpers.randomInteger(0, filteredWeight - 1);
    this.rarity = 0;
    for (let i = 0; i <= maxRarity && i < rarities.length; i++) {
      const w = customWeights ? customWeights[i] || 0 : rarities[i][3];
      rand -= w;
      if (rand < 0) {
        this.rarity = i;
        break;
      }
    }

    this.size = rarities[this.rarity][0];
    this.coins = rarities[this.rarity][1];
    this.maxHealth = rarities[this.rarity][2];
    this.health = new Health(this.maxHealth, 0);

    this.hasBar = this.rarity >= 3;

    this.shape = Polygon.createFromRectangle(0, 0, this.size, this.size * 0.6);
    this.targets.add(Types.Entity.Sword);

    this.needsCoastClearance = true;
    this.skipBorderCollision = true;

    // Despawn coin after 20 minutes
    this.despawnTime = Date.now() + (1000 * 60 * 20);

    this.lastAttacker = null;
    this.lastAttackTime = 0;

    this.claimer = null;
    this.claimTime = 0;

    this.spawn();
  }

  update(dt) {
    if (Date.now() > this.despawnTime) {
      if(this.respawnable) this.createInstance();
      this.remove();
    }
  }

  processTargetsCollision(sword) {
    if (!sword.canCollide(this)) return;

    sword.collidedEntities.add(this);

    const currentTime = Date.now();

    if (!sword.player.isBot) {
      const claimActive = this.claimer && !this.claimer.removed && (currentTime - this.claimTime) < 4000;
      if (claimActive && this.claimer !== sword.player) {
        sword.player.flags.set(Types.Flags.ContestedObject, true);
        return;
      }
      this.claimer = sword.player;
      this.claimTime = currentTime;
    }

    const recentlyAttackedByOther = this.lastAttacker !== null && this.lastAttacker !== sword.player && (currentTime - this.lastAttackTime) < 5000;

    let dmg = sword.damage.value;
    if (sword.player.modifiers.chestPower && !recentlyAttackedByOther) {
      dmg *= sword.player.modifiers.chestPower;
    }
    // PvE Master card
    if (sword.player.chestDamageMultiplier) {
      dmg *= sword.player.chestDamageMultiplier;
    }

    if (this.hasBar) {
      if (sword.player.isBot) {
        const m = typeof sword.player.chestSkillMultiplier === 'function'
          ? sword.player.chestSkillMultiplier() : 1;
        dmg *= m;
      } else {
        const tf = tierFactor[this.rarity] !== undefined ? tierFactor[this.rarity] : 1;
        const z = sword.player.reportedChestZone || 0;
        const combo = sword.player.reportedChestCombo || 1;
        let mult;
        if (z === 4) mult = chestBaseMult + (zoneTarget.perfect - chestBaseMult) * tf;
        else if (z === 3) mult = chestBaseMult + (zoneTarget.great - chestBaseMult) * tf;
        else if (z === 2) mult = chestBaseMult + (zoneTarget.good - chestBaseMult) * tf;
        else if (z === 1) mult = chestBaseMult * barMissMult;
        else mult = chestBaseMult;
        if (z >= 2) mult *= combo;
        dmg *= mult;
        sword.player.reportedChestZone = 0;
        sword.player.reportedChestCombo = 1;
      }
    }

    this.health.damaged(dmg);

    this.lastAttacker = sword.player;
    this.lastAttackTime = currentTime;

    if (this.health.isDead) {
      sword.player.flags.set(Types.Flags.ChestDestroy, true);

      let chestCoins = this.coins;
      if (sword.player.cards && sword.player.cards.hasMajor(121)) {
        chestCoins = Math.round(chestCoins * 0.70);
      }
      // Chest Keys card (120)
      if (sword.player.cards && sword.player.cards.hasMajor(120)) {
        chestCoins = Math.round(chestCoins * 0.50);
      }
      this.game.map.spawnCoinsInShape(this.shape, chestCoins);

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
