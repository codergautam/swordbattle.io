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
    this.abilityCooldownTimer = new Timer(0, 5.1, 5.1);
    this.abilityCooldownTimer.finished = false;
    this.abilityDurationTimer = new Timer(duration, duration, duration);
    this.abilityDurationTimer.finished = true;
    this.isAbilityActive = false;
    this.grantedAbility = null;
  }

  grantAbility(config) {
    this.grantedAbility = config;
    this.abilityDurationTimer = new Timer(config.duration, config.duration, config.duration);
    this.abilityDurationTimer.finished = true;
    this.abilityCooldownTimer = new Timer(Math.max(0, config.cooldown - 2), config.cooldown, config.cooldown);
  }

  get isAbilityAvailable() {
    return this.abilityDurationTimer.duration !== 0 || !!this.grantedAbility;
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
    const cooldown = this.grantedAbility ? this.grantedAbility.cooldown : this.constructor.abilityCooldown;
    if (this.abilityCooldownTimer.maxTime === 5.1 || this.grantedAbility) {
      this.abilityCooldownTimer = new Timer(cooldown, cooldown, cooldown);
    }
    this.abilityCooldownTimer.renew();
    this.isAbilityActive = false;
  }

  applyAbilityEffects() {
    if (this.grantedAbility && this.grantedAbility.apply) {
      this.grantedAbility.apply(this.player);
    }
  }

  update(dt) {
    this.player.modifiers.invisible = false;
    this.player.modifiers.damageScale = true;
    this.player.wideSwing = false;
    this.player.modifiers.swingWide = false;
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
