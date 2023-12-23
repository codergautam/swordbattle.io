const Types = require('../Types');
const { swingDurationIncrease, maxSwingDuration } = require('../../config').sword;

class LevelSystem {
  constructor(player) {
    this.player = player;
    this.level = 1;
    this.maxLevel = 50;
    this.coins = 0;
    this.previousLevelCoins = 0;
    this.nextLevelCoins = 3;
    this.upgradePoints = 0;

    this.buffs = {
      [Types.Buff.Speed]: {
        level: 0,
        max: 10,
        step: 0.075,
        buyable: true,
      },
      [Types.Buff.Size]: {
        level: 0,
        max: 5,
        step: 0.15,
        buyable: false,
      },
      [Types.Buff.Health]: {
        level: 0,
        step: 0.2,
        max: 10,
        buyable: true,
      },
      [Types.Buff.Regeneration]: {
        level: 0,
        step: 0.2,
        max: 10,
        buyable: true,
      },
      [Types.Buff.Damage]: {
        level: 0,
        step: 0.1,
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

  addBuff(type, buy=true) {
    if (!this.canBuff(type)) return;
    if (buy && !this.buffs[type].buyable) return;
    this.buffs[type].level += 1;
    if(buy) this.upgradePoints -= 1;
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
    this.player.sword.knockback.multiplier['level'] = 1 + (this.buffs[Types.Buff.Size].level * 0.1);
  }

  levelUp() {
    this.level += 1;
    this.previousLevelCoins = this.nextLevelCoins;
    // 20percent increase
    this.nextLevelCoins = this.previousLevelCoins * 2.2;

    this.upgradePoints += 1;
    this.player.evolutions.checkForEvolutions();
    this.addBuff(Types.Buff.Size, false);
  }
}

module.exports = LevelSystem;
