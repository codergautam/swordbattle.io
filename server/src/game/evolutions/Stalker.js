const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Stalker extends Evolution {
  static type = Types.Evolution.Stalker;
  static level = 27;
  static previousEvol = Types.Evolution.Vampire;
  static abilityDuration = 6.5;
  static abilityCooldown = 72;

  applyAbilityEffects() {
    this.player.modifiers.invisible = true;
      this.player.shape.setScale(0.01);
      this.player.viewport.zoom.multiplier *= 0.01

    this.player.speed.multiplier *= 1.32;

    this.player.health.regenWait.multiplier = 0;
    this.player.health.regen.multiplier *= 1.25;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.leech = 0.35;
    this.player.shape.setScale(1.05);
    this.player.sword.damage.multiplier *= 1.15;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.speed.multiplier *= 0.9;
    this.player.sword.knockback.multiplier['ability'] = 1;
    this.player.sword.swingDuration.multiplier['ability'] = 0.85;
    this.player.health.max.multiplier *= 1.175;
    this.player.health.regenWait.multiplier = 0.5;
    this.player.health.regen.multiplier *= 0.5;
  }
}
