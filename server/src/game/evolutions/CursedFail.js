const Evolution = require('./BasicEvolution');
const Types = require('../Types');
//THIS IS TO BE USED IF PLAYERS FAIL TO KILL BOSS IN THE TIME THEY ARE GIVEN
module.exports = class CursedFail extends Evolution {
  static type = Types.Evolution.CursedFail;
  static level = 51;
  static previousEvol = Types.Evolution.Cursed;
  static abilityDuration = 0;
  static abilityCooldown = 0;

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
    //Will have Striker chain mechanic to one-shot whole lobby
  }
}

