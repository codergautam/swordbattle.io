const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Rook extends Evolution {
  static type = Types.Evolution.Rook;
  static level = 22;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 0.2;
  static abilityCooldown = 5.5;

  applyAbilityEffects() {
    const lastInput = this.player.lastDirectionInput ?? 3; // dwn

    let angle = Math.PI / 2; // dwn

    switch (lastInput) {
      case 1: // u
        angle = -Math.PI / 2;
        break;
      case 2: // r
        angle = 0;
        break;
      case 3: // d
        angle = Math.PI / 2;
        break;
      case 4: // l
        angle = Math.PI;
        break;
    }

    this.player.shape.x = this.player.shape.x + (375 * Math.cos(angle));
    this.player.shape.y = this.player.shape.y + (375 * Math.sin(angle));
  }

  update(dt) {
    this.player.modifiers.disableDiagonalMovement = true;

    this.player.shape.setScale(1.15);
    this.player.speed.multiplier *= 0.875;
    this.player.sword.damage.multiplier *= 1.375;
    this.player.sword.swingDuration.multiplier['ability'] = 1.325;
    this.player.sword.knockback.multiplier['ability'] = 0.9;
    this.player.knockbackResistance.multiplier *= 1.35;
    this.player.health.max.multiplier *= 1.425;
    this.player.health.regen.multiplier *= 1.5;
    this.player.health.regenWait.multiplier *= 1.175;
    super.update(dt);
  }
}
