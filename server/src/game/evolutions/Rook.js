const Evolution = require("./BasicEvolution");
const Types = require("../Types");

module.exports = class Rook extends Evolution {
  static type = Types.Evolution.Rook;
  static level = 22;
  static previousEvol = Types.Evolution.Tank;
  static abilityDuration = 0.2;
  static abilityCooldown = 5;

  applyAbilityEffects() {
    const downInputs = this.player.inputs?.downInputs;

    let angle = Math.PI / 2; // dwn

    if (downInputs && downInputs.length > 0) {
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

    this.player.shape.x = this.player.shape.x + 300 * Math.cos(angle);
    this.player.shape.y = this.player.shape.y + 300 * Math.sin(angle);
  }

  update(dt) {
    this.player.modifiers.disableDiagonalMovement = true;

    this.player.shape.setScale(1.25);
    this.player.sword.damage.multiplier *= 1.2;
    this.player.sword.knockback.multiplier["ability"] = 1.25;
    this.player.knockbackResistance.multiplier *= 1.25;
    this.player.health.max.multiplier *= 1.25;
    this.player.health.regen.multiplier *= 1.25;
    this.player.health.regenWait.multiplier *= 1.15;
    super.update(dt);
  }
};
