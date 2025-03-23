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

    this.player.speed.multiplier *= 1.275;

    this.player.health.regenWait.multiplier = 100;
    this.player.health.regen.multiplier *= 0;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.leech = 0.2;
    this.player.shape.setScale(1.075);
    this.player.sword.damage.multiplier *= 1.15;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.speed.multiplier *= 0.85;
    this.player.sword.knockback.multiplier['ability'] = 0.75;
    this.player.sword.swingDuration.multiplier['ability'] = 0.85;
    this.player.health.max.multiplier *= 1.15;
    this.player.health.regenWait.multiplier = 0.65;
    this.player.health.regen.multiplier *= 0.4;
  }
}
