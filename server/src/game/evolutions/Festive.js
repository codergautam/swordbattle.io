const Evolution = require('./BasicEvolution');
const Types = require('../Types');
const Ornament = require('../entities/Ornament');

module.exports = class Festive extends Evolution {
  static type = Types.Evolution.Festive;
  static level = 9999; // No winter evols now
  static previousEvol = Types.Evolution.CandyWalker;
  static abilityDuration = 6;
  static abilityCooldown = 60;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
    this.ornaments = [];
    this.baseRotationSpeed = Math.PI / 1.2; // 0.425 rps
    this.currentRotationSpeed = this.baseRotationSpeed;

    this.spawnOrnaments();
  }

  spawnOrnaments() {
    const orbitRadius = 300;

    const ornament1Data = {
      owner: this.player,
      ornamentIndex: 0,
      angle: 0,
      orbitRadius: orbitRadius,
    };
    const ornament1 = new Ornament(this.player.game, ornament1Data);
    ornament1.isStatic = false;
    this.player.game.addEntity(ornament1);
    this.ornaments.push(ornament1);

    const ornament2Data = {
      owner: this.player,
      ornamentIndex: 1,
      angle: Math.PI,
      orbitRadius: orbitRadius,
    };
    const ornament2 = new Ornament(this.player.game, ornament2Data);
    ornament2.isStatic = false;
    this.player.game.addEntity(ornament2);
    this.ornaments.push(ornament2);
  }

  activateAbility() {
    super.activateAbility();
    this.currentRotationSpeed = Math.PI * 2;
  }

  deactivateAbility() {
    super.deactivateAbility();
    this.currentRotationSpeed = this.baseRotationSpeed;
  }

  applyAbilityEffects() {
    this.player.sword.damage.multiplier *= 1;
    this.player.sword.knockback.multiplier['ability'] = 2;
    this.player.knockbackResistance.multiplier *= 2;
    this.player.shape.setScale(1.1);

    this.player.speed.multiplier *= 1.2;
    this.player.sword.swingDuration.multiplier['ability'] = 0.65;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;

    for (const ornament of this.ornaments) {
      if (ornament && !ornament.removed) {
        ornament.angle += this.currentRotationSpeed * dt;
        if (ornament.angle > Math.PI * 2) {
          ornament.angle -= Math.PI * 2;
        }
      }
    }

    this.player.speed.multiplier *= 0.9;
    this.player.shape.setScale(1.05);
    this.player.sword.damage.multiplier *= 0.95;
    this.player.sword.knockback.multiplier['ability'] = 0.7;
    this.player.knockbackResistance.multiplier *= 1.5;

    this.player.health.max.multiplier *= 1.15;
    this.player.health.regen.multiplier *= 1.15;
    this.player.health.regenWait.multiplier *= 1.15;
  }

  remove() {
    // Clean up ornaments when evolving to another evolution
    for (const ornament of this.ornaments) {
      if (ornament && !ornament.removed) {
        this.player.game.removeEntity(ornament);
      }
    }
    this.ornaments = [];
    super.remove();
  }
}
