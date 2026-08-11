const { randomUUID } = require('crypto');
const Types = require('../Types');
const Zombie = require('../entities/Zombie');
const api = require('../../network/api');

const PHASE = Object.freeze({ IDLE: 'idle', WARNING: 'warning', ACTIVE: 'active' });
const MIN_DELAY = 12 * 60;
const MAX_DELAY = 18 * 60;
const WARNING_SECONDS = 20;
const MAX_DURATION = 8 * 60;
const RING_RADIUS = 1200;
const RING_VARIANTS = Object.freeze([
  ...Array(16).fill(1), ...Array(3).fill(2), 3,
]);

function accountId(player) {
  return Number(player?.client?.account?.id) || null;
}

class WorldEventDirector {
  constructor(game, options = {}) {
    this.game = game;
    this.random = options.random || Math.random;
    this.phase = PHASE.IDLE;
    this.activePlay = 0;
    this.warningElapsed = 0;
    this.eventElapsed = 0;
    this.nextAt = this.randomDelay();
    this.eventId = null;
    this.ringRecipients = new Set();
    this.zombieIds = new Set();
    this.contributions = new Map();
    this.suspended = null;
    this.lastResult = null;
  }

  randomDelay() {
    return MIN_DELAY + this.random() * (MAX_DELAY - MIN_DELAY);
  }

  realPlayers() {
    return Array.from(this.game.players).filter(p => p && !p.removed && !p.isBot && p.type === Types.Entity.Player);
  }

  eligiblePlayers() {
    return this.realPlayers().filter(p => !p.inSafezone && !p.cards?.isTutorial);
  }

  playerKey(player) {
    const id = accountId(player);
    if (id) return `account:${id}`;
    const clientKey = player?.client?.id ?? player?.client?.socket?.remoteAddress ?? player?.id;
    return `guest:${clientKey}`;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (this.phase === PHASE.IDLE) {
      if (this.eligiblePlayers().length === 0) return;
      this.activePlay += dt;
      if (this.activePlay >= this.nextAt) this.beginWarning();
      return;
    }
    if (this.phase === PHASE.WARNING) {
      if (this.eligiblePlayers().length === 0) return;
      this.warningElapsed += dt;
      if (this.warningElapsed >= WARNING_SECONDS) this.beginOutbreak();
      return;
    }

    this.eventElapsed += dt;
    this.removeUnexpectedNpcs();
    for (const player of this.realPlayers()) this.trySpawnRing(player);
    this.pruneZombies();
    if (this.eventElapsed >= MAX_DURATION) this.finish(false, 'timeout');
    else if (this.ringRecipients.size > 0 && this.zombieIds.size === 0) this.finish(true, 'cleared');
  }

  beginWarning() {
    this.phase = PHASE.WARNING;
    this.warningElapsed = 0;
    this.broadcast('Zombie outbreak in 20 seconds! Leave shelter to join the defense.');
  }

  beginOutbreak() {
    this.phase = PHASE.ACTIVE;
    this.eventElapsed = 0;
    this.eventId = randomUUID();
    this.ringRecipients.clear();
    this.zombieIds.clear();
    this.contributions.clear();
    this.suspendNpcs();
    for (const player of this.realPlayers()) this.trySpawnRing(player);
    this.broadcast('The zombie outbreak has begun!');
  }

  summonOutbreak() {
    if (this.phase === PHASE.ACTIVE) return false;
    this.beginOutbreak();
    return true;
  }

  isRegularNpc(entity) {
    if (!entity || entity.removed || entity.type === Types.Entity.Zombie) return false;
    return (entity.type === Types.Entity.Player && entity.isBot) || Types.Groups.Mobs.includes(entity.type);
  }

  suspendNpcs() {
    if (this.suspended) return;
    const savedAiCount = this.game.map.aiPlayersCount;
    const definitions = [];
    const timers = [];
    let botCount = 0;
    this.game.map.aiPlayersCount = 0;
    for (const timer of Array.from(this.game.map.entityTimers)) {
      const type = timer?.definition?.type;
      if (type === Types.Entity.Player || Types.Groups.Mobs.includes(type)) {
        timers.push(timer);
        this.game.map.entityTimers.delete(timer);
      }
    }
    for (const entity of Array.from(this.game.entities.values())) {
      if (!this.isRegularNpc(entity)) continue;
      if (entity.type === Types.Entity.Player && entity.isBot) botCount += 1;
      definitions.push(entity.originalDefinition ? { ...entity.originalDefinition } : null);
      entity.respawnable = false;
      this.game.removeEntity(entity);
    }
    this.suspended = { savedAiCount, botCount, definitions: definitions.filter(Boolean), timers };
  }

  removeUnexpectedNpcs() {
    for (const entity of Array.from(this.game.entities.values())) {
      if (this.isRegularNpc(entity)) {
        entity.respawnable = false;
        this.game.removeEntity(entity);
      }
    }
  }

  restoreNpcs() {
    if (!this.suspended) return;
    this.game.map.aiPlayersCount = this.suspended.savedAiCount;
    for (const timer of this.suspended.timers) this.game.map.entityTimers.add(timer);
    for (const definition of this.suspended.definitions) {
      if (definition.type !== Types.Entity.Player) this.game.map.addEntity(definition);
    }
    for (let i = 0; i < this.suspended.botCount; i++) this.game.map.spawnPlayerBot();
    this.suspended = null;
  }

  trySpawnRing(player) {
    if (!player || player.removed || player.inSafezone || player.cards?.isTutorial) return false;
    const key = this.playerKey(player);
    if (this.ringRecipients.has(key)) return false;
    // A Player-derived zombie owns one Sword too. Capacity is checked for the whole ring.
    if (this.game.entities.size + RING_VARIANTS.length * 2 > this.game.maxEntities) return false;

    const start = ((player.id || 0) * 2.399963229728653) % (Math.PI * 2);
    const spawned = [];
    for (let i = 0; i < RING_VARIANTS.length; i++) {
      const zombie = new Zombie(this.game, RING_VARIANTS[i], this.eventId, player);
      const baseAngle = start + i / RING_VARIANTS.length * Math.PI * 2;
      const point = this.ringPoint(player, baseAngle);
      zombie.shape.x = point.x;
      zombie.shape.y = point.y;
      if (!this.game.addEntity(zombie)) {
        for (const prior of spawned) this.game.removeEntity(prior);
        this.game.removeEntity(zombie.sword);
        return false;
      }
      spawned.push(zombie);
      this.zombieIds.add(zombie.id);
    }
    this.ringRecipients.add(key);
    return true;
  }

  ringPoint(player, baseAngle) {
    const safe = this.game.map.safezone?.shape;
    const tutorial = this.game.map.tutorialSafezone?.shape;
    const minX = Number.isFinite(Number(this.game.map.x)) ? Number(this.game.map.x) : -Infinity;
    const minY = Number.isFinite(Number(this.game.map.y)) ? Number(this.game.map.y) : -Infinity;
    const maxX = Number.isFinite(this.game.map.width) ? minX + this.game.map.width : Infinity;
    const maxY = Number.isFinite(this.game.map.height) ? minY + this.game.map.height : Infinity;
    for (let attempt = 0; attempt < 72; attempt++) {
      const angle = baseAngle + attempt * Math.PI * 2 / 72;
      const x = player.shape.x + Math.cos(angle) * RING_RADIUS;
      const y = player.shape.y + Math.sin(angle) * RING_RADIUS;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      if (safe?.isPointInside?.(x, y) || tutorial?.isPointInside?.(x, y)) continue;
      return { x, y };
    }
    return {
      x: player.shape.x + Math.cos(baseAngle) * RING_RADIUS,
      y: player.shape.y + Math.sin(baseAngle) * RING_RADIUS,
    };
  }

  pruneZombies() {
    for (const id of Array.from(this.zombieIds)) {
      const zombie = this.game.entities.get(id);
      if (!zombie || zombie.removed) this.zombieIds.delete(id);
    }
  }

  recordContribution(player, damage, killed) {
    if (this.phase !== PHASE.ACTIVE || !player || player.isBot) return;
    const key = this.playerKey(player);
    let entry = this.contributions.get(key);
    if (!entry) {
      entry = { player, accountId: accountId(player), damage: 0, kills: 0 };
      this.contributions.set(key, entry);
    }
    entry.player = player;
    entry.damage += Math.max(0, Number(damage) || 0);
    if (killed) entry.kills += 1;
  }

  finish(success, reason) {
    const resultId = this.eventId;
    for (const id of Array.from(this.zombieIds)) {
      const zombie = this.game.entities.get(id);
      if (zombie) this.game.removeEntity(zombie);
    }
    this.zombieIds.clear();
    this.restoreNpcs();
    if (success) this.awardValor(resultId);
    this.lastResult = { id: resultId, success, reason, elapsed: this.eventElapsed };
    this.broadcast(success ? 'Outbreak cleared! Valor has been awarded.' : 'Outbreak failed. The undead survivors have withdrawn.');
    this.phase = PHASE.IDLE;
    this.activePlay = 0;
    this.warningElapsed = 0;
    this.eventElapsed = 0;
    this.nextAt = this.randomDelay();
    this.eventId = null;
    this.ringRecipients.clear();
    this.contributions.clear();
  }

  awardValor(eventId) {
    const qualifying = Array.from(this.contributions.values())
      .filter(c => c.accountId && (c.damage >= 200 || c.kills >= 2));
    if (!qualifying.length) return;
    qualifying.sort((a, b) => b.damage - a.damage || b.kills - a.kills || a.accountId - b.accountId);
    const mvpId = qualifying[0].accountId;
    const awards = qualifying.map(c => ({
      accountId: c.accountId,
      crests: 5 + (c.accountId === mvpId ? 1 : 0),
      zombieKills: c.kills,
      mvp: c.accountId === mvpId,
    }));
    this.postAwardsWithRetry({ outbreakId: eventId, awards }, 0);
  }

  postAwardsWithRetry(payload, attempt) {
    api.post('/valor/award', payload, response => {
      if (response?.error) {
        if (attempt < 3) setTimeout(() => this.postAwardsWithRetry(payload, attempt + 1), 500 * (2 ** attempt));
        return;
      }
      for (const profile of response?.profiles || []) {
        for (const player of this.realPlayers()) {
          if (accountId(player) === Number(profile.accountId) && player.client?.account) {
            player.client.account.valorCrests = Number(profile.crests) || 0;
          }
        }
      }
    });
  }

  handleCommand(player, rawMessage) {
    if (typeof rawMessage !== 'string' || !rawMessage.startsWith('/')) return false;
    const parts = rawMessage.trim().toLowerCase().split(/\s+/);
    if (parts[0] === '/event') {
      const now = Date.now();
      if (now - (player.lastWorldEventCommandAt || 0) < 500) return true;
      player.lastWorldEventCommandAt = now;
      const contribution = this.contributions.get(this.playerKey(player)) || { damage: 0, kills: 0 };
      if (this.phase === PHASE.IDLE) player.setSystemMessage(`Next outbreak after ${Math.ceil(Math.max(0, this.nextAt - this.activePlay))}s of active play.`);
      else if (this.phase === PHASE.WARNING) player.setSystemMessage(`Outbreak warning: ${Math.ceil(WARNING_SECONDS - this.warningElapsed)}s. Your contribution: 0 damage, 0 kills.`);
      else player.setSystemMessage(`Outbreak: ${this.zombieIds.size} enemies, ${Math.floor(this.eventElapsed)}s elapsed. You: ${Math.round(contribution.damage)} damage, ${contribution.kills} kills.`);
      return true;
    }
    if (parts[0] === '/valor') {
      const now = Date.now();
      if (now - (player.lastWorldEventCommandAt || 0) < 500) return true;
      player.lastWorldEventCommandAt = now;
      if (parts[1] === 'top') {
        api.get('/valor/top?limit=10', data => {
          if (data?.error) return player.setSystemMessage('Valor leaderboard is temporarily unavailable.');
          const text = (data?.profiles || []).map((p, i) => `${i + 1}. ${p.username}: ${p.crests}`).join(' | ');
          player.setSystemMessage(text || 'No Valor Crests have been earned yet.');
        });
      } else if (!accountId(player)) {
        player.setSystemMessage('Guests can fight in outbreaks, but Valor Crests require an account.');
      } else {
        api.get(`/valor/profile/${accountId(player)}`, data => {
          if (data?.error) return player.setSystemMessage('Your Valor profile is temporarily unavailable.');
          player.setSystemMessage(`Valor: ${data.crests || 0} Crests, ${data.outbreaksCleared || 0} clears, ${data.zombieKills || 0} zombie kills, ${data.mvpCount || 0} MVPs.`);
        });
      }
      return true;
    }
    return false;
  }

  broadcast(message) {
    for (const player of this.realPlayers()) player.setSystemMessage(message);
  }
}

WorldEventDirector.PHASE = PHASE;
WorldEventDirector.RING_VARIANTS = RING_VARIANTS;
WorldEventDirector.constants = { MIN_DELAY, MAX_DELAY, WARNING_SECONDS, MAX_DURATION, RING_RADIUS };
module.exports = WorldEventDirector;
