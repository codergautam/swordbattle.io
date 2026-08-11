const PhaseEvolution = require('./helpers/PhaseEvolution');
const Types = require('../Types');

module.exports = class Phantom extends PhaseEvolution {
  static type = Types.Evolution.Phantom;
  static level = 24;
  static previousEvol = Types.Evolution.Stalker;
  static abilityDuration = 4.5;
  static abilityCooldown = 90;
  static phaseSpeed = 1.4;
  static ambushWindow = 3;
  static ambushDamageScale = 0.35;

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.90);
    this.player.speed.multiplier *= 1.08;
    this.player.sword.damage.multiplier *= 1.35;
    this.player.health.max.multiplier *= 1.10;
    this.player.modifiers.leech = 0.35;
  }
};
