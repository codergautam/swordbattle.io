const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Lumberjack extends Evolution {
  static type = Types.Evolution.Lumberjack;
  static level = 27;
  static previousEvol = [Types.Evolution.Samurai, Types.Evolution.Rook];
  // static level = 1;
  static abilityDuration = 4;
  static abilityCooldown = 24;

  applyAbilityEffects() {
    this.player.modifiers.chestPower = 4;
    this.player.viewport.zoom.multiplier *= 0.7;
    this.player.shape.setScale(1.5);
    this.player.speed.multiplier *= 1.2;
    this.player.sword.knockback.multiplier['ability'] = 3;
    this.player.sword.swingDuration.multiplier['ability'] = 0.6;
    this.player.health.regenWait.multiplier *= 0;
    this.player.health.regen.multiplier *= 2.5;
    this.player.sword.damage.multiplier *= 1.15;
  }

  update(dt) {
    this.player.modifiers.chestPower = 3;
    this.player.modifiers.mobPower = 1; // If too op for grinding then nerf
    this.player.shape.setScale(1.2);
    this.player.sword.knockback.multiplier['ability'] = 2;
    this.player.knockbackResistance.multiplier *= 0.5;
    this.player.sword.damage.multiplier *= 1.15;
    this.player.speed.multiplier *= 0.85;
    this.player.health.regenWait.multiplier *= 0.5;
    this.player.health.max.multiplier *= 0.85;
    super.update(dt);
  }
}
