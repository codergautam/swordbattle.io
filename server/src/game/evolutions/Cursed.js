const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Cursed extends Evolution {
  static type = Types.Evolution.Cursed;
  static level = 50; //Will get 500k coins which is lvl 51, this is only lvl 50 so we can have CursedFail for "3rd ability"
  static previousEvol = Types.Evolution.Sniper;
  static abilityDuration = 1800;
  static abilityCooldown = 1;

  applyAbilityEffects() {
    this.player.modifiers.noRestrictKnockback = true;
    this.player.shape.setScale(1.7);
    this.player.sword.damage.multiplier *= 1.8;
    this.player.sword.knockback.multiplier['ability'] = 1.3;
    this.player.knockbackResistance.multiplier *= 1.7;
    this.player.speed.multiplier *= 1.225;
    this.player.sword.swingDuration.multiplier['ability'] = 1.25;
    this.player.health.max.multiplier *= 9;
    this.player.health.regenWait.multiplier *= 1.5;
    this.player.health.regen.multiplier *= 1;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(1.5);
    this.player.sword.damage.multiplier *= 1.5;
    this.player.knockbackResistance.multiplier *= 1.25;
    this.player.speed.multiplier *= 1.175;
    this.player.health.max.multiplier *= 7;
    this.player.health.regenWait.multiplier *= 3;
    this.player.health.regen.multiplier *= 0.8;
    this.player.sword.swingDuration.multiplier['ability'] = 1;
  }
}

