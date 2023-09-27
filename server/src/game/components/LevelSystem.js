class LevelSystem {
  constructor(player) {
    this.player = player;
    this.level = 1;
    this.maxLevel = 50;
    this.coins = 0;
    this.previousLevelCoins = 0;
    this.nextLevelCoins = 10;
    this.upgradePoints = 0;
  }

  addCoins(coins) {
    this.coins += coins;
    while (this.coins >= this.nextLevelCoins) {
      if (this.level === this.maxLevel) break;

      this.levelUp();
    }
  }

  levelUp() {
    this.level += 1;
    this.previousLevelCoins = this.nextLevelCoins;
    this.nextLevelCoins = this.previousLevelCoins * 1.5;
    this.upgradePoints += 1; 
    this.player.evolutions.checkForEvolutions();
  }
}

module.exports = LevelSystem;
