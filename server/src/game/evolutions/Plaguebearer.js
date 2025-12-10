const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Plaguebearer extends Evolution {
  static type = Types.Evolution.Plaguebearer;
  static level = 1000; // Plaguebearer not in rotation
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 6;
  static abilityCooldown = 90;
  static poisonRadius = 2000;
  static poisonDPS = 10;

  applyAbilityEffects() {
    this.poisonFieldActive = true;
    this.player.speed.multiplier *= 0.75;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.poisonDamage = true;

    this.player.shape.setScale(0.975);
    this.player.speed.multiplier *= 1.05;

    this.player.sword.knockback.multiplier['ability'] = 2;
    this.player.knockbackResistance.multiplier *= 0.75;

    this.player.health.max.multiplier *= 1.15;
    this.player.health.regenWait.multiplier *= 1.1;

    this.player.sword.swingDuration.multiplier['ability'] = 1.125;

    if (!this.isAbilityActive) {
      this.poisonFieldActive = false;
    }

    if (this.poisonFieldActive) {
      const radius = this.constructor.poisonRadius;
      const radiusSq = radius * radius;
      const dps = this.constructor.poisonDPS;

      for (const entity of this.player.game.entities.values()) {
        if (!entity || entity.removed) continue;
        if (!entity.shape) continue;
        if (entity === this.player) continue;

        const dx = entity.shape.x - this.player.shape.x;
        const dy = entity.shape.y - this.player.shape.y;
        if ((dx * dx + dy * dy) <= radiusSq) {
          try {
            const damage = dps * dt;
            if (typeof entity.damaged === 'function') {
              entity.damaged(damage, this.player);
            }
            if (entity.flags && typeof entity.flags.set === 'function') {
              entity.flags.set(Types.Flags.PoisonDamaged, this.player.id || true);
            }
          } catch (e) {
            //
          }
        }
      }
    }
  }
}
