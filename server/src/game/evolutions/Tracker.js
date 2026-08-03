const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class Tracker extends Evolution {
  static type = Types.Evolution.Tracker;
  static level = 24;
  static previousEvol = [Types.Evolution.Lumberjack, Types.Evolution.Fisherman, Types.Evolution.Warrior, Types.Evolution.Fighter, Types.Evolution.Stalker, Types.Evolution.Defender];
  static abilityDuration = 0.01;
  static abilityCooldown = 60;
  static zoneRadius = 1600;
  static minSpeedFactor = 0.85;
  static maxSpeedFactor = 1.4;
  static radarSlowDuration = 2.5;
  static radarSlowStart = 0.2;

  constructor(player) {
    super(player);
    this.trackedSpeeds = new Map();
  }

  isTrackable(entity) {
    return entity && !entity.removed && entity !== this.player
      && entity.type === Types.Entity.Player
      && !entity.inSafezone
      && entity.depth === this.player.depth;
  }

  activateAbility() {
    const wasReady = this.canActivateAbility && !this.isAbilityActive;
    super.activateAbility();
    if (wasReady) {
      this.sendRadarPulse();
    }
  }

  sendRadarPulse() {
    const radius = this.constructor.zoneRadius;
    const radiusSq = radius * radius;

    for (const entity of this.player.game.entities.values()) {
      if (!this.isTrackable(entity)) continue;

      const dx = entity.shape.x - this.player.shape.x;
      const dy = entity.shape.y - this.player.shape.y;
      if (dx * dx + dy * dy <= radiusSq) {
        entity.addEffect(Types.Effect.RadarSlow, 'tracker_radar', {
          duration: this.constructor.radarSlowDuration,
          slowStart: this.constructor.radarSlowStart,
        });
      }
    }

    this.player.flags.set(Types.Flags.RadarPulse, true);
  }

  updateSpeedMatch(dt) {
    const me = this.player;
    const radius = this.constructor.zoneRadius;
    const radiusSq = radius * radius;

    const candidates = me.game.entitiesQuadtree
      ? me.game.entitiesQuadtree.get({
          x: me.shape.x - radius,
          y: me.shape.y - radius,
          width: radius * 2,
          height: radius * 2,
        })
      : Array.from(me.game.entities.values()).map(entity => ({ entity }));

    const seen = new Set();
    let fastest = -1;

    for (const { entity } of candidates) {
      if (!this.isTrackable(entity)) continue;

      const dx = entity.shape.x - me.shape.x;
      const dy = entity.shape.y - me.shape.y;
      if (dx * dx + dy * dy > radiusSq) continue;

      seen.add(entity.id);
      let record = this.trackedSpeeds.get(entity.id);
      if (!record) {
        record = { x: entity.shape.x, y: entity.shape.y, ema: -1 };
        this.trackedSpeeds.set(entity.id, record);
      } else if (dt > 0) {
        const movedX = entity.shape.x - record.x;
        const movedY = entity.shape.y - record.y;
        const instant = Math.sqrt(movedX * movedX + movedY * movedY) / dt;
        record.ema = record.ema < 0 ? instant : record.ema * 0.85 + instant * 0.15;
        record.x = entity.shape.x;
        record.y = entity.shape.y;
      }

      if (entity.effects && entity.effects.has('tracker_radar')) continue;

      if (record.ema > fastest) fastest = record.ema;
    }

    for (const id of this.trackedSpeeds.keys()) {
      if (!seen.has(id)) this.trackedSpeeds.delete(id);
    }

    if (fastest >= 0) {
      const mySpeed = Math.max(1, me.speed.value);
      let factor = fastest / mySpeed;
      factor = Math.max(this.constructor.minSpeedFactor, Math.min(this.constructor.maxSpeedFactor, factor));
      me.speed.multiplier *= factor;
    }
  }

  update(dt) {
    super.update(dt);
    this.player.shape.setScale(1.025);
    this.player.sword.damage.multiplier *= 1.31;
    this.player.sword.knockback.multiplier['ability'] = 1.05;
    this.player.sword.swingDuration.multiplier['ability'] = 0.90;
    this.player.speed.multiplier *= 1.10;
    this.player.knockbackResistance.multiplier *= 1.15;
    this.player.health.max.multiplier *= 1.27;
    this.player.health.regen.multiplier *= 1.05;
    this.player.viewport.zoom.multiplier *= 0.95;

    this.updateSpeedMatch(dt);
  
  }
}
