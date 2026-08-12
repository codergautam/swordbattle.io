const Bishop = require('./Bishop');
const Types = require('../Types');

module.exports = class Arsenal extends Bishop {
  static type = Types.Evolution.Arsenal;
  static level = 42;
  static previousEvol = Types.Evolution.Bishop;
  static abilityDuration = 5;
  static abilityCooldown = 70;
  static chakramCount = 36;
  static chakramRadius = 260;
  static chakramBand = 64;
  static chakramHitCooldown = 0.35;
  static chakramDamageScale = 0.42;
  static cannonRange = 2600;
  static cannonCooldown = 0.75;
  static cannonDamageScale = 0.60;
  static cannonSpeed = 2050;
  static cannonKnockback = 115;

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(1.08 / 1.05);
    this.player.speed.multiplier *= 0.90 / 0.92;
    this.player.health.max.multiplier *= 1.21 / 1.12;
    this.player.knockbackResistance.multiplier *= 1.20 / 1.12;
    this.player.sword.damage.multiplier *= 0.94 / 0.90;
  }
};
