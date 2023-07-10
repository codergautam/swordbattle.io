const House1 = require('./entities/House1');

class GameMap {
  constructor(game, width, height, coinsCount) {
    this.game = game;
    this.width = width;
    this.height = height;

    const count = Math.round((width * height) * 0.000007);
    this.coinsCount = coinsCount === undefined ? count : coinsCount;
  }

  spawnObjects() {
    const house = new House1(this.game, 600, 600, 480 * 2, 311 * 2);
    this.game.addBuilding(house);
  }

  getData() {
    return {
      width: this.width,
      height: this.height,
    };
  }
}

module.exports = GameMap;
