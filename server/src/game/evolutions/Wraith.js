const PhaseEvolution = require('./helpers/PhaseEvolution');
const Types = require('../Types');

module.exports = class Wraith extends PhaseEvolution {
  static type = Types.Evolution.Wraith;
  static level = 42;
  static previousEvol = Types.Evolution.Phantom;
  static abilityDuration = 5;
  static abilityCooldown = 75;
  static phaseSpeed = 1.5;
  static ambushWindow = 4;
  static ambushDamageScale = 0.50;

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.86);
    this.player.speed.multiplier *= 1.15;
    this.player.sword.damage.multiplier *= 1.55;
    this.player.health.max.multiplier *= 1.15;
    this.player.modifiers.leech = 0.45;
  }
};
