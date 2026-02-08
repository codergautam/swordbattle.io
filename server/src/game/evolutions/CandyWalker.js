const Evolution = require('./BasicEvolution');
const Types = require('../Types');
const Timer = require('../components/Timer');

module.exports = class CandyWalker extends Evolution {
  static type = Types.Evolution.CandyWalker;
  static level = 9999; // No winter evols now
  static previousEvol = Types.Evolution.SnowWalker;
  static abilityDuration = 7.5;
  static abilityCooldown = 75;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
    this.boostTimer = new Timer(0, 2.5, 2.5);
    this.boostTimer.finished = true;
  }

  onDamage(target) {
    if (!target) return;
    if (target.type === Types.Entity.Player && !target.isBot) {
      this.boostTimer.renew();
    }
  }

  applyAbilityEffects() {
    this.player.speed.multiplier *= 1.25;
    this.player.sword.damage.multiplier *= 1.25;

    this.player.shape.setScale(1.1);

    this.player.health.regen.multiplier *= 1;
    this.player.health.regenWait.multiplier = 0;

    this.player.sword.swingDuration.multiplier['ability'] = 0.75;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;

    this.boostTimer.update(dt);
    const boostActive = !this.boostTimer.finished;

    this.player.speed.multiplier *= 0.95;
    this.player.sword.damage.multiplier *= 0.95;

    this.player.sword.knockback.multiplier['ability'] = 1.35;
    this.player.knockbackResistance.multiplier *= 0.8;

    this.player.health.max.multiplier *= 0.95;
    this.player.health.regen.multiplier *= 1.1;
    this.player.health.regenWait.multiplier *= 0.9;

    if (boostActive) {
      this.player.speed.multiplier *= 1.25;
      this.player.sword.damage.multiplier *= 1.25;
    }
    //TODO: Damagecooldown: 1.1
  }
}
