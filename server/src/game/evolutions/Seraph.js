const Medic = require('./Medic');
const Types = require('../Types');

module.exports = class Seraph extends Medic {
  static type = Types.Evolution.Seraph;
  static level = 42;
  static previousEvol = Types.Evolution.Medic;
  static abilityDuration = 0.6;
  static abilityCooldown = 55;
  static selfHealScale = 0.45;
  static teamHealScale = 0.30;
  static teamHealRadius = 1000;

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.98 / 0.95);
    this.player.speed.multiplier *= 1.05;
    this.player.sword.damage.multiplier *= 0.70 / 0.55;
    this.player.modifiers.throwDamage = 3.8;
    this.player.health.max.multiplier *= 1.35 / 1.20;
    this.player.health.regen.multiplier *= 1.40 / 1.20;
  }
};
