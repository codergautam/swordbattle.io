const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Rook extends Evolution {
  static type = Types.Evolution.Rook;
  static level = 22;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 0.2;
  static abilityCooldown = 6;

  applyAbilityEffects() {
    const downInputs = this.player.inputs?.downInputs;

    let angle = Math.PI / 2; // dwn

    if(downInputs && downInputs.length > 0) {
      switch (downInputs[0]) {
        case 1:
          angle = -Math.PI / 2;
          break;
        case 2:
          angle = 0;
          break;
        case 3:
          angle = Math.PI / 2;
          break;
        case 4:
          angle = Math.PI;
          break;
      }
    }

    this.player.shape.x = this.player.shape.x + (375 * Math.cos(angle));
    this.player.shape.y = this.player.shape.y + (375 * Math.sin(angle));
  }

  update(dt) {
    this.player.modifiers.disableDiagonalMovement = true;

    this.player.shape.setScale(1.15);
    this.player.speed.multiplier *= 0.85;
    this.player.sword.damage.multiplier *= 1.425;
    this.player.sword.swingDuration.multiplier['ability'] = 1.4;
    this.player.sword.knockback.multiplier['ability'] = 0.9;
    this.player.knockbackResistance.multiplier *= 1.35;
    this.player.health.max.multiplier *= 1.3;
    this.player.health.regen.multiplier *= 1.5;
    this.player.health.regenWait.multiplier *= 1.5;
    super.update(dt);
  }
}
