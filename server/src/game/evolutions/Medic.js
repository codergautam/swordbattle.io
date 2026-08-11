const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Medic extends Evolution {
  static type = Types.Evolution.Medic;
  static level = 18;
  static previousEvol = Types.Evolution.Archer;
  static abilityDuration = 0.45;
  static abilityCooldown = 70;
  static selfHealScale = 0.33;
  static teamHealScale = 0.20;
  static teamHealRadius = 800;

  activateAbility() {
    const wasReady = this.canActivateAbility && !this.isAbilityActive;
    super.activateAbility();
    if (!wasReady || !this.isAbilityActive) return;
    this.player.health.gain(this.constructor.selfHealScale * this.player.health.max.value);
    this.healNpcTeam();
  }

  nearbyEntities(radius) {
    const { x, y } = this.player.shape;
    if (this.player.game.entitiesQuadtree) {
      return this.player.game.entitiesQuadtree.get({
        x: x - radius, y: y - radius, width: radius * 2, height: radius * 2,
      }).map(record => record.entity);
    }
    return Array.from(this.player.game.entities.values());
  }

  healNpcTeam() {
    const teamId = this.player.botTeamId;
    if (!this.player.isBot || teamId === null || teamId === undefined) return;
    const radiusSq = this.constructor.teamHealRadius ** 2;
    const seen = new Set();
    for (const entity of this.nearbyEntities(this.constructor.teamHealRadius)) {
      if (!entity || seen.has(entity.id) || entity === this.player || entity.removed) continue;
      seen.add(entity.id);
      if (entity.type !== Types.Entity.Player || !entity.isBot || entity.botTeamId !== teamId) continue;
      if (!entity.health || entity.health.isDead || entity.depth !== this.player.depth) continue;
      const dx = entity.shape.x - this.player.shape.x;
      const dy = entity.shape.y - this.player.shape.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      entity.health.gain(this.constructor.teamHealScale * entity.health.max.value);
    }
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(0.95);
    this.player.sword.damage.multiplier *= 0.55;
    this.player.modifiers.throwDamage = 3.1;
    this.player.health.max.multiplier *= 1.20;
    this.player.health.regen.multiplier *= 1.20;
  }
}
