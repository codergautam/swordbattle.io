const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Fighter extends Evolution {
  static type = Types.Evolution.Fighter;
  static level = 27;
  static previousEvol = Types.Evolution.Berserker;
  static abilityDuration = 4;
  static abilityCooldown = 19;

  applyAbilityEffects() {
    this.player.shape.setScale(0.925);
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.knockback.multiplier['ability'] = 1.5;
    this.player.speed.multiplier *= 1.225;
     this.player.sword.swingDuration.multiplier['ability'] = 0.7;
     this.player.health.max.multiplier *= 0.85;
     this.player.health.regenWait.multiplier *= 0.25;
     this.player.health.regen.multiplier *= 0.75;
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.975);
     this.player.sword.swingDuration.multiplier['default'] = 0.9;
    this.player.sword.damage.multiplier *= 1.15;
    this.player.speed.multiplier *= 1.15;
    this.player.health.max.multiplier *= 0.95;
    this.player.health.regenWait.multiplier *= 0.5;
  }
}

