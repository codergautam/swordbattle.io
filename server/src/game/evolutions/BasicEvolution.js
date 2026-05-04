const Timer = require('../components/Timer');
const Effect = require('../effects/Effect');
const Types = require('../Types');

class BasicEvolution extends Effect {
  static type = Types.Evolution.Basic;
  static biomes = [];
  static level = 0;
  static abilityDuration = 0;
  static abilityCooldown = 90;

  static refundPct = {
    playerMelee: 0.05,
    playerThrown: 0.03,
    mob: 0.005,
    chest: 0.0035,
  };
  static refundCapS = {
    playerMelee: 3,
    playerThrown: 1.8,
    mob: 0.4,
    chest: 0.3,
  };

  constructor(player) {
    super(player, 'evolution');
    const cooldown = this.constructor.abilityCooldown;
    const duration = this.constructor.abilityDuration;
    this.abilityCooldownTimer = new Timer(0, 5.1, 5.1);
    this.abilityCooldownTimer.finished = false;
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
    if (this.abilityCooldownTimer.maxTime === 5.1) {
      const cooldown = this.constructor.abilityCooldown;
      this.abilityCooldownTimer = new Timer(cooldown, cooldown, cooldown);
    }
    this.abilityCooldownTimer.renew();
    this.isAbilityActive = false;
  }

  applyAbilityEffects() {
  }

  refundCooldown(seconds) {
    if (this.isAbilityActive) return 0;
    if (!this.abilityCooldownTimer || this.abilityCooldownTimer.finished) return 0;
    if (!seconds || seconds <= 0) return 0;
    const remaining = this.abilityCooldownTimer.duration - this.abilityCooldownTimer.time;
    const applied = Math.min(seconds, remaining);
    this.abilityCooldownTimer.time += applied;
    if (this.abilityCooldownTimer.time >= this.abilityCooldownTimer.duration) {
      this.abilityCooldownTimer.time = this.abilityCooldownTimer.duration;
      this.abilityCooldownTimer.finished = true;
    }
    return applied;
  }

  refundCooldownByKind(kind) {
    if (this.isAbilityActive) return 0;
    if (!this.abilityCooldownTimer || this.abilityCooldownTimer.finished) return 0;
    const pct = this.constructor.refundPct && this.constructor.refundPct[kind];
    if (!pct) return 0;
    const base = this.constructor.abilityCooldown;
    if (!base || base <= 0) return 0;
    const cap = (this.constructor.refundCapS && this.constructor.refundCapS[kind]) || Infinity;
    const seconds = Math.min(base * pct, cap);
    const applied = this.refundCooldown(seconds);
    if (applied > 0 && this.player && this.player.flags && Types.Flags.CooldownRefund) {
      const prev = this.player.flags.has(Types.Flags.CooldownRefund)
        ? this.player.flags.get(Types.Flags.CooldownRefund)
        : 0;
      this.player.flags.set(Types.Flags.CooldownRefund, prev + Math.round(applied * 100));
    }
    return applied;
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
