const Evolution = require("./BasicEvolution");
const Types = require("../Types");

module.exports = class Vampire extends Evolution {
  static type = Types.Evolution.Vampire;
  static level = 22;
  static previousEvol = Types.Evolution.Knight;
  // static level = 1;
  static abilityDuration = 3;
  static abilityCooldown = 15;

  applyAbilityEffects() {
    this.player.modifiers.leech = 0.5;
    this.player.sword.knockback.multiplier["ability"] = 1.8;
    this.player.speed.multiplier *= 1.2;
  }

  update(dt) {
    this.player.modifiers.leech = 0.25;
    this.player.health.max.multiplier *= 0.8;
    super.update(dt);
  }
};
