const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const Types = require('../../Types');

class Pond extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.River],
    forbiddenEntities: [Types.Entity.House1],
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Pond, objectData);

    this.isStatic = true;
    this.shape = Polygon.createFromPoints(0, 0, [
      [0, 0],
      [0.17532467532467533 * this.size, -0.08311688311688312 * this.size],
      [0.36103896103896105 * this.size, -0.07792207792207792 * this.size],
      [0.538961038961039 * this.size, 0.0025974025974025974 * this.size],
      [0.6272727272727273 * this.size, 0.08051948051948052 * this.size],
      [0.6441558441558441 * this.size, 0.16883116883116883 * this.size],
      [0.5792207792207792 * this.size, 0.2896103896103896 * this.size],
      [0.4662337662337662 * this.size, 0.36363636363636365 * this.size],
      [0.37012987012987014 * this.size, 0.38701298701298703 * this.size],
      [0.21688311688311687 * this.size, 0.44935064935064933 * this.size],
      [-0.09480519480519481 * this.size, 0.474025974025974 * this.size],
      [-0.17532467532467533 * this.size, 0.4142857142857143 * this.size],
      [-0.2038961038961039 * this.size, 0.33766233766233766 * this.size],
      [-0.35584415584415585 * this.size, 0.21428571428571427 * this.size],
      [-0.34935064935064936 * this.size, 0.05714285714285714 * this.size],
      [-0.23636363636363636 * this.size, -0.04155844155844156 * this.size],
      [-0.08441558441558442 * this.size, -0.023376623376623377 * this.size],
    ]);
    this.targets.push(Types.Entity.Player);

    this.spawn();
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Speed, 'pond', { multiplier: 1.1 });
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    return state;
  }
}

module.exports = Pond;
