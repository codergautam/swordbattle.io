const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Rook extends Evolution {
  static type = Types.Evolution.Rook;
  static level = 12;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 0.3;
  static abilityCooldown = 8;

  constructor(player) {
    super(player);
    this._dashAngle = 0;
    this._dashDistance = 0;
    this._dt = 0;
    this._castleCharges = null;
    this._castleRecharge = 0;
  }

  hasUpgrade(id) {
    return this.player.upgrades && this.player.upgrades.acquiredIds
      && this.player.upgrades.acquiredIds.includes(id);
  }

  get canActivateAbility() {
    if (this.hasUpgrade(Types.Upgrade.Castle)) {
      return this._castleCharges > 0 && !this.isAbilityActive;
    }
    return this.abilityCooldownTimer.finished;
  }

  activateAbility() {
    if (!this.canActivateAbility || this.isAbilityActive) return;

    if (this.hasUpgrade(Types.Upgrade.KingRook)) {
      this._dashAngle = this.player.movementDirection;
    } else {
      const lastInput = this.player.lastDirectionInput ?? 3;
      switch (lastInput) {
        case 1: this._dashAngle = -Math.PI / 2; break;
        case 2: this._dashAngle = 0; break;
        case 3: this._dashAngle = Math.PI / 2; break;
        case 4: this._dashAngle = Math.PI; break;
      }
    }
    this._dashDistance = 0;

    super.activateAbility();

    if (this.isAbilityActive && this.hasUpgrade(Types.Upgrade.Castle) && this._castleCharges != null) {
      this._castleCharges -= 1;
    }
  }

  applyAbilityEffects() {
    const totalDist = 900;
    const dashDuration = 0.3;
    const remaining = totalDist - this._dashDistance;
    if (remaining <= 0) return;

    if (this.hasUpgrade(Types.Upgrade.Teleport)) {
      this.player.shape.x += remaining * Math.cos(this._dashAngle);
      this.player.shape.y += remaining * Math.sin(this._dashAngle);
      this._dashDistance = totalDist;
      return;
    }

    const speed = totalDist / dashDuration;
    const frameDist = Math.min(speed * this._dt, remaining);

    this.player.shape.x += frameDist * Math.cos(this._dashAngle);
    this.player.shape.y += frameDist * Math.sin(this._dashAngle);
    this._dashDistance += frameDist;
  }

  deactivateAbility() {
    if (this.hasUpgrade(Types.Upgrade.Castle)) {
      this.isAbilityActive = false;
      return;
    }
    super.deactivateAbility();
  }

  update(dt) {
    this._dt = dt;
    this.player.modifiers.disableDiagonalMovement = true;

    if (this.hasUpgrade(Types.Upgrade.Castle)) {
      if (this._castleCharges === null) { this._castleCharges = 2; this._castleRecharge = 0; }
      if (this._castleCharges < 2) {
        this._castleRecharge += dt;
        if (this._castleRecharge >= 8) { this._castleCharges += 1; this._castleRecharge = 0; }
      } else {
        this._castleRecharge = 0;
      }
    } else {
      this._castleCharges = null;
      this._castleRecharge = 0;
    }

    if (this.isAbilityActive && this.hasUpgrade(Types.Upgrade.Teleport)) {
      this.player.modifiers.dashNoclip = true;
    }

    this.player.shape.setScale(1.1);
    this.player.speed.multiplier *= 0.925;
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.swingDuration.multiplier['ability'] = 1.15;
    this.player.sword.knockback.multiplier['ability'] = 0.9;
    this.player.knockbackResistance.multiplier *= 1.3;
    this.player.health.max.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 1.25;
    this.player.health.regenWait.multiplier *= 1.1;
    super.update(dt);
  }
}
