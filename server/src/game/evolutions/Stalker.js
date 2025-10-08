const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Stalker extends Evolution {
  static type = Types.Evolution.Stalker;
  static level = 27;
  static previousEvol = Types.Evolution.Vampire;
  static abilityDuration = 7;
  static abilityCooldown = 90;

  applyAbilityEffects() {
    this.player.modifiers.invisible = true;
      this.player.shape.setScale(0.01);
      this.player.viewport.zoom.multiplier *= 0.01

    this.player.speed.multiplier *= 1.5;

    this.player.health.regenWait.multiplier = 0;
    this.player.health.regen.multiplier *= 1.5;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.leech = 0.375;
    this.player.sword.damage.multiplier *= 1.15;
    this.player.knockbackResistance.multiplier *= 0;
    this.player.speed.multiplier *= 0.95;
    this.player.sword.knockback.multiplier['ability'] = 1;
    this.player.sword.swingDuration.multiplier['ability'] = 0.925;
    this.player.health.max.multiplier *= 1.175;
    this.player.health.regenWait.multiplier = 0.5;
    this.player.health.regen.multiplier *= 0.5;
  }
}
