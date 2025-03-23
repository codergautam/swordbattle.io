const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Stalker extends Evolution {
  static type = Types.Evolution.Stalker;
  static level = 25;
  static abilityDuration = 6;
  static abilityCooldown = 54;

  applyAbilityEffects() {
    this.player.modifiers.invisible = true;
      this.player.shape.setScale(0.01);
      this.player.viewport.zoom.multiplier *= 0.01

    this.player.speed.multiplier *= 1.25;

    this.player.health.regenWait.multiplier = 100;
    this.player.health.regen.multiplier *= 0;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.leech = 0.1;
    this.player.shape.setScale(1.1);
    this.player.sword.damage.multiplier *= 1.1;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.sword.knockback.multiplier['ability'] = -1;
    this.player.speed.multiplier *= 0.9;

    this.player.health.max.multiplier *= 1.1;
    this.player.health.regenWait.multiplier = 0.7;
    this.player.health.regen.multiplier *= 0.5;
  }
}
