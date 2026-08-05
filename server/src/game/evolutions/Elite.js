const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Elite extends Evolution {
  static type = Types.Evolution.Elite;
  static level = 24;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 6;
  static abilityCooldown = 70;
  static maxStacks = 5;
  static damagePerStack = 0.15;
  static playerHitGrace = 4;
  static otherHitGrace = 1;
  static decayInterval = 1;

  constructor(player) {
    super(player);
    this.stacks = 0;
    this.stackGainedThisSwing = false;
    this.swingStartedDuringAbility = false;
    this.timeSinceHit = 0;
    this.hitGrace = this.constructor.playerHitGrace;
    this.decayStarted = false;
  }

  onSwordSwing() {
    this.stackGainedThisSwing = false;
    this.swingStartedDuringAbility = this.isAbilityActive;
  }

  onHit(target, isFlying) {
    this.timeSinceHit = 0;
    this.decayStarted = false;
    this.hitGrace = (target && target.type === Types.Entity.Player)
      ? this.constructor.playerHitGrace
      : this.constructor.otherHitGrace;
    if (isFlying ? this.isAbilityActive : this.swingStartedDuringAbility) return;
    if (!isFlying) {
      if (this.stackGainedThisSwing) return;
      this.stackGainedThisSwing = true;
    }
    this.stacks = Math.min(this.constructor.maxStacks, this.stacks + 1);
  }

  applyAbilityEffects() {
    this.player.sword.swingDuration.multiplier['ability'] = 0.85;
    this.player.knockbackResistance.multiplier *= 1.1;
  }

  update(dt) {
    super.update(dt);

    if (this.stacks > 0 && !this.isAbilityActive) {
      this.timeSinceHit += dt;
      const threshold = this.decayStarted ? this.constructor.decayInterval : this.hitGrace;
      if (this.timeSinceHit >= threshold) {
        this.stacks -= 1;
        this.timeSinceHit = 0;
        this.decayStarted = true;
      }
    }

    this.player.flags.set(Types.Flags.EliteCombo, this.stacks);

    this.player.shape.setScale(1.05);
    this.player.speed.multiplier *= 1.05;
    this.player.sword.damage.multiplier *= 0.85 * (1 + this.constructor.damagePerStack * this.stacks);
    this.player.sword.knockback.multiplier['ability'] = 1.1;
    this.player.knockbackResistance.multiplier *= 1.05;
    this.player.health.max.multiplier *= 1.05;
    this.player.health.regen.multiplier *= 1.05;
  
  }
}
