const Evolution = require('./BasicEvolution');
const Types = require('../Types');
const Timer = require('../components/Timer');

module.exports = class Fighter extends Evolution {
  static type = Types.Evolution.Fighter;
  static level = 27;
  static previousEvol = Types.Evolution.Berserker;
  static abilityDuration = 4;
  static abilityCooldown = 24;

  constructor(player) {
    super(player);
    this.boostTimer = new Timer(0, 2, 2);
    this.boostTimer.finished = true;
  }

  onDamaged(attacker) {
    if (!attacker) return;
    if (attacker.type === Types.Entity.Player && !attacker.isBot) {
      this.boostTimer.renew();
      this.player.modifiers.BoostOnDamage = true;
    }
  }

  applyAbilityEffects() {
    this.player.modifiers.BoostOnDamage = false;
    this.player.shape.setScale(0.955);
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.knockback.multiplier['ability'] = 1.5;
    this.player.speed.multiplier *= 1.2;
     this.player.sword.swingDuration.multiplier['ability'] = 0.8;
     this.player.health.max.multiplier *= 0.85;
     this.player.health.regenWait.multiplier *= 0.25;
     this.player.health.regen.multiplier *= 0.75;
  }

  update(dt) {
    super.update(dt);

    this.boostTimer.update(dt);
    const boostActive = !this.boostTimer.finished;
    this.player.modifiers.BoostOnDamage = boostActive;

    this.player.shape.setScale(0.97);
    this.player.sword.swingDuration.multiplier['default'] = 0.9;

    this.player.sword.damage.multiplier *= 0.875;
    this.player.speed.multiplier *= 0.875;

    if (boostActive) {
      this.player.speed.multiplier *= 1.175;
      this.player.sword.damage.multiplier *= 1.175;
    }

    this.player.health.max.multiplier *= 0.95;
    this.player.health.regenWait.multiplier *= 0.55;
    this.player.health.regen.multiplier *= 0.8;
  }
}