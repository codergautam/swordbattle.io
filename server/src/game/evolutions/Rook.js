const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Rook extends Evolution {
  static type = Types.Evolution.Rook;
  static level = 12;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 0.6;
  static abilityCooldown = 8;

  constructor(player) {
    super(player);
    this._dashAngle = 0;
    this._dashDistance = 0;
    this._dt = 0;
  }

  activateAbility() {
    if (!this.canActivateAbility || this.isAbilityActive) return;

    const lastInput = this.player.lastDirectionInput ?? 3;
    switch (lastInput) {
      case 1: this._dashAngle = -Math.PI / 2; break;
      case 2: this._dashAngle = 0; break;
      case 3: this._dashAngle = Math.PI / 2; break;
      case 4: this._dashAngle = Math.PI; break;
    }
    this._dashDistance = 0;

    super.activateAbility();
  }

  applyAbilityEffects() {
    const totalDist = 450;
    const dashDuration = 0.15;
    const remaining = totalDist - this._dashDistance;
    if (remaining <= 0) return;

    const speed = totalDist / dashDuration;
    const frameDist = Math.min(speed * this._dt, remaining);

    this.player.shape.x += frameDist * Math.cos(this._dashAngle);
    this.player.shape.y += frameDist * Math.sin(this._dashAngle);
    this._dashDistance += frameDist;
  }

  update(dt) {
    this._dt = dt;
    this.player.modifiers.disableDiagonalMovement = true;

    this.player.shape.setScale(1.1);
    this.player.speed.multiplier *= 0.925;
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.swingDuration.multiplier['ability'] = 1.325;
    this.player.sword.knockback.multiplier['ability'] = 0.9;
    this.player.knockbackResistance.multiplier *= 1.3;
    this.player.health.max.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 1.25;
    this.player.health.regenWait.multiplier *= 1.1;
    super.update(dt);
  }
}
