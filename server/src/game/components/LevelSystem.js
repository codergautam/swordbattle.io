const Types = require('../Types');
const { swingDurationIncrease, maxSwingDuration } = require('../../config').sword;

var levels = [
  {'coins': 0, 'scale': 0},
  {'coins': 5, 'scale': 1},
{'coins': 15, 'scale': 2},
{'coins': 25, 'scale': 4},
{'coins': 50, 'scale': 8},
{'coins': 100, 'scale': 16},
{'coins': 500, 'scale': 20},
{'coins': 1000, 'scale': 24},
{'coins': 1500, 'scale': 27},
{'coins': 2000, 'scale': 30},
{'coins': 3000, 'scale': 32},
{'coins': 4000, 'scale': 36},
{'coins': 5000, 'scale': 38},
{'coins': 7500, 'scale': 40},
{'coins': 9000, 'scale': 41},
{'coins': 10000, 'scale': 42},
{'coins': 15000, 'scale': 43},
{'coins': 20000, 'scale': 44},
{'coins': 30000, 'scale': 45},
{'coins': 50000, 'scale': 46},
{'coins': 100000, 'scale': 47},
{'coins': 200000, 'scale': 48},
{'coins': 300000, 'scale': 49},
{'coins': 500000, 'scale': 50}
];

class LevelSystem {
  constructor(player) {
    this.player = player;
    this.level = 1;
    this.maxLevel = levels.length-1;
    this.coins = 0;
    this.previousLevelCoins = 0;
    this.nextLevelCoins = levels[this.level].coins;
    this.upgradePoints = 0;

    this.buffs = {
      [Types.Buff.Speed]: {
        level: 0,
        max: 10,
        step: 0.05,
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
        step: 0.08,
        max: 10,
        buyable: true,
      },
      [Types.Buff.Regeneration]: {
        level: 0,
        step: 0.15,
        max: 10,
        buyable: true,
      },
      [Types.Buff.Damage]: {
        level: 0,
        step: 0.045,
        max: 10,
        buyable: true,
      },
    }
  }

  addCoins(coins) {
    this.coins += coins;
    while (this.coins >= this.nextLevelCoins) {
      if (this.level === this.maxLevel) break;

      this.levelUp();
    }
  }

  canBuff(type) {
    const buff = this.buffs[type];
    return this.upgradePoints > 0 && buff && buff.level < buff.max;
  }

  addBuff(type, buy=true, cnt=1) {
    for(let i=0; i<cnt; i++) {
    if (!this.canBuff(type)) return;
    if (buy && !this.buffs[type].buyable) return;
    this.buffs[type].level += 1;
    if(buy) this.upgradePoints -= 1;

    // if health buff, increase current health
    if (type === Types.Buff.Health) {
      this.player.health.percent *= 1.5;
      this.player.health.percent = Math.min(1, this.player.health.percent);
    }
    }
  }

  applyBuffs() {
    for (const [type, buff] of Object.entries(this.buffs)) {
      if (buff.level === 0) continue;

      const multiplier = 1 + buff.level * buff.step;
      switch (Number(type)) {
        case Types.Buff.Speed:
          this.player.speed.multiplier *= multiplier;
          break;
        case Types.Buff.Size:
          this.player.shape.setScale(multiplier);
          break;
        case Types.Buff.Health:
          this.player.health.max.multiplier *= multiplier;
          break;
        case Types.Buff.Regeneration:
          this.player.health.regen.multiplier *= multiplier;
          break;
        case Types.Buff.Damage:
          this.player.sword.damage.multiplier *= multiplier;
          break;
      }
    }
    this.player.sword.swingDuration.multiplier['level'] = Math.min(maxSwingDuration, Math.max(1, swingDurationIncrease * (this.level-1)));
    this.player.sword.knockback.multiplier['level'] = 1 + (this.buffs[Types.Buff.Size].level * 0.015);
  }

  levelUp() {
    this.level += 1;
    this.previousLevelCoins = this.nextLevelCoins;
    this.nextLevelCoins = levels[this.level] ? levels[this.level].coins : this.nextLevelCoins * 2.2;
    this.upgradePoints += 1;
    this.player.evolutions.checkForEvolutions();

    const sizeBuffsNeeded = levels[this.level].scale - levels[this.level-1].scale;
    if(!sizeBuffsNeeded) sizeBuffsNeeded = 0;
    this.addBuff(Types.Buff.Size, false, sizeBuffsNeeded);
  }
}

module.exports = LevelSystem;
