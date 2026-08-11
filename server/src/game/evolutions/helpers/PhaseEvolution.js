const Evolution = require('../BasicEvolution');

module.exports = class PhaseEvolution extends Evolution {
  static phaseSpeed = 1.4;
  static ambushWindow = 3;
  static ambushDamageScale = 0.35;

  constructor(player) {
    super(player);
    this.ambushTime = 0;
    this.suppressAmbush = false;
  }

  isSheltered() {
    return !!(this.player.inSafezone || this.player.cards?.isTutorial);
  }

  activateAbility() {
    if (this.isSheltered()) return;
    const wasReady = this.canActivateAbility && !this.isAbilityActive;
    super.activateAbility();
    if (!wasReady || !this.isAbilityActive) return;
    this.ambushTime = 0;
    this.player.sword.swingRequested = false;
    if (this.player.offhandSword) this.player.offhandSword.swingRequested = false;
  }

  deactivateAbility() {
    const wasActive = this.isAbilityActive;
    super.deactivateAbility();
    this.clearPhaseModifiers();
    if (wasActive && !this.suppressAmbush && !this.isSheltered()) {
      this.ambushTime = this.constructor.ambushWindow;
    }
  }

  cancelPhase() {
    if (!this.isAbilityActive) return;
    this.suppressAmbush = true;
    this.deactivateAbility();
    this.suppressAmbush = false;
    this.ambushTime = 0;
  }

  clearPhaseModifiers() {
    this.player.modifiers.invisible = false;
    this.player.modifiers.phaseImmune = false;
    this.player.modifiers.attackLocked = false;
    this.player.modifiers.noKnockback = false;
  }

  applyAbilityEffects() {
    this.player.modifiers.invisible = true;
    this.player.modifiers.phaseImmune = true;
    this.player.modifiers.attackLocked = true;
    this.player.modifiers.noKnockback = true;
    this.player.speed.multiplier *= this.constructor.phaseSpeed;
  }

  onHit(target, isFlying) {
    if (this.isAbilityActive || this.ambushTime <= 0 || !target || target.removed) return;
    this.ambushTime = 0;
    if (typeof target.damaged === 'function') {
      target.damaged(this.player.sword.damage.value * this.constructor.ambushDamageScale, this.player, isFlying);
    }
  }

  update(dt) {
    const wasActive = this.isAbilityActive;
    super.update(dt);
    if (this.isAbilityActive && this.isSheltered()) this.cancelPhase();
    if (!wasActive && !this.isAbilityActive && this.ambushTime > 0) {
      this.ambushTime = Math.max(0, this.ambushTime - dt);
    }
  }

  remove() {
    this.ambushTime = 0;
    this.clearPhaseModifiers();
    super.remove();
  }
};
