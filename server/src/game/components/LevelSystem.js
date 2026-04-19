const Types = require('../Types');
const { swingDurationIncrease, maxSwingDuration } = require('../../config').sword;

var levels = [
{'coins': 0, 'scale': 0},          // L1
{'coins': 50, 'scale': 2},         // L2
{'coins': 150, 'scale': 6},       // L3
{'coins': 300, 'scale': 10},       // L4
{'coins': 500, 'scale': 16},       // L5
{'coins': 750, 'scale': 20},       // L6
{'coins': 1000, 'scale': 24},      // L7
{'coins': 1400, 'scale': 27},      // L8
{'coins': 2000, 'scale': 30},      // L9
{'coins': 3000, 'scale': 32},      // L10
{'coins': 4000, 'scale': 36},      // L11
{'coins': 5000, 'scale': 38},      // L12
{'coins': 6500, 'scale': 40},      // L13
{'coins': 8500, 'scale': 41},      // L14
{'coins': 11000, 'scale': 42},     // L15
{'coins': 15000, 'scale': 43},     // L16
{'coins': 17500, 'scale': 44},     // L17
{'coins': 20000, 'scale': 44},     // L18
{'coins': 22500, 'scale': 45},     // L19
{'coins': 25000, 'scale': 45},     // L20
{'coins': 30000, 'scale': 45},     // L21
{'coins': 35000, 'scale': 46},     // L22
{'coins': 42000, 'scale': 46},     // L23
{'coins': 50000, 'scale': 46},     // L24
{'coins': 62000, 'scale': 47},     // L25
{'coins': 75000, 'scale': 47},     // L26
{'coins': 94000, 'scale': 48},     // L27
{'coins': 115000, 'scale': 48},    // L28
{'coins': 142000, 'scale': 49},    // L29
{'coins': 175000, 'scale': 49},    // L30
{'coins': 200000, 'scale': 49},    // L31
{'coins': 250000, 'scale': 50},    // L32
{'coins': 325000, 'scale': 50},    // L33
{'coins': 400000, 'scale': 51},    // L34
{'coins': 490000, 'scale': 51},    // L35
{'coins': 600000, 'scale': 52},    // L36
{'coins': 740000, 'scale': 52},    // L37
{'coins': 910000, 'scale': 53},    // L38
{'coins': 1120000, 'scale': 54},   // L39
{'coins': 1380000, 'scale': 54},   // L40
{'coins': 1750000, 'scale': 55},   // L41
{'coins': 1850000, 'scale': 55},   // L42
{'coins': 2000000, 'scale': 55},   // L43
];

class LevelSystem {
  constructor(player) {
    this.player = player;
    this.level = 1;
    this.maxLevel = levels.length-1;
    this.coins = 0;
    this.tokens = 0;
    this.previousLevelCoins = 0;
    this.nextLevelCoins = levels[this.level].coins;
    this.upgradePoints = 0;

    this.buffs = {
      [Types.Buff.Speed]: {
        level: 0,
        max: 10,
        step: 0.03,
        buyable: true,
      },
      [Types.Buff.Size]: {
        level: 0,
        max: levels[this.maxLevel].scale,
        step: 0.04,
        buyable: false,
      },
      [Types.Buff.Health]: {
        level: 0,
        step: 0.06,
        max: 10,
        buyable: true,
      },
      [Types.Buff.Regeneration]: {
        level: 0,
        step: 0.075,
        max: 10,
        buyable: true,
      },
      [Types.Buff.Damage]: {
        level: 0,
        step: 0.04,
        max: 10,
        buyable: true,
      },
    }
  }

  addCoins(coins) {
    this.coins += Math.round(coins * (this.player.coinMultiplier || 1));
    while (this.coins >= this.nextLevelCoins) {
      if (this.level === this.maxLevel) break;

      this.levelUp();
    }
  }

  addTokens(tokens) {
    this.tokens += tokens;
  }

  // Old buff methods removed - card system replaces buyable buffs
  // Size buff is still auto-applied via addSizeBuff below

  addSizeBuff(cnt=1) {
    for (let i = 0; i < cnt; i++) {
      const buff = this.buffs[Types.Buff.Size];
      if (buff.level >= buff.max) return;
      buff.level += 1;
    }
  }

  applyBuffs() {
    // Only apply Size buff (auto-applied on level up) and level-based scaling
    const sizeBuff = this.buffs[Types.Buff.Size];
    if (sizeBuff.level > 0) {
      const multiplier = 1 + sizeBuff.level * sizeBuff.step;
      this.player.shape.setScale(multiplier);
      this.player.speed.multiplier *= Math.max(0.835, 1 - sizeBuff.level * 0.003);
    }
    this.player.sword.swingDuration.multiplier['level'] = Math.min(maxSwingDuration, Math.max(1, swingDurationIncrease * (this.level-1)));
    this.player.sword.knockback.multiplier['level'] = 1 + (sizeBuff.level * 0.015);
  }

  levelUp() {
    this.level += 1;
    this.previousLevelCoins = this.nextLevelCoins;
    this.nextLevelCoins = levels[this.level] ? levels[this.level].coins : this.nextLevelCoins * 2.2;
    this.player.evolutions.checkForEvolutions();

    let sizeBuffsNeeded = levels[this.level].scale - levels[this.level-1].scale;
    if(!sizeBuffsNeeded) sizeBuffsNeeded = 0;
    this.addSizeBuff(sizeBuffsNeeded);

    // Queue a card pick instead of granting upgrade points
    this.player.cards.queueCardPick();
  }
}

module.exports = LevelSystem;
