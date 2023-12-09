const Timer = require('../components/Timer');
const Effect = require('../effects/Effect');
const Types = require('../Types');

class BasicEvolution extends Effect {
  static type = Types.Evolution.Basic;
  static biomes = [];
  static level = 0;
  static abilityDuration = 0;
  static abilityCooldown = 60;

  constructor(player) {
    super(player, 'evolution');
    const cooldown = this.constructor.abilityCooldown;
    const duration = this.constructor.abilityDuration;
    this.abilityCooldownTimer = new Timer(cooldown, cooldown, cooldown);
    this.abilityCooldownTimer.finished = true;
    this.abilityDurationTimer = new Timer(duration, duration, duration);
    this.abilityDurationTimer.finished = true;
    this.isAbilityActive = false;
  }

  get isAbilityAvailable() {
    return this.abilityDurationTimer.duration !== 0;
  }

  get canActivateAbility() {
    return this.abilityCooldownTimer.finished;
  }

  get cooldownTime() {
    return this.abilityCooldownTimer.duration - this.abilityCooldownTimer.time;
  }

  get durationTime() {
    return this.abilityDurationTimer.duration - this.abilityDurationTimer.time;
  }

  activateAbility() {
    if(!this.canActivateAbility) return;
    if(this.isAbilityActive) return;
    this.abilityDurationTimer.renew();
    this.isAbilityActive = true;
  }

  deactivateAbility() {
    this.abilityCooldownTimer.renew();
    this.isAbilityActive = false;
  }

  applyAbilityEffects() {
  }

  update(dt) {
    this.abilityCooldownTimer.update(dt);
    this.abilityDurationTimer.update(dt);

    if (this.isAbilityActive && this.abilityDurationTimer.finished) {
      this.deactivateAbility();
    }
    if (this.isAbilityActive) {
      this.applyAbilityEffects();
    }
  }
}

module.exports = BasicEvolution;
