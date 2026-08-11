const Types = require('../Types');

const DEFAULTS = Object.freeze({
  assistWindowMs: 12000,
  encounterWindowMs: 120000,
  ledgerCleanupIntervalMs: 30000,
  minimumAssistShare: 0.12,
  killHealPercent: 0.06,
  repeatRewardMultipliers: [1, 0.55, 0.2, 0],
});

class CombatDirector {
  constructor(game, options = {}) {
    this.game = game;
    this.config = { ...DEFAULTS, ...options };
    this.damageLedger = new Map();
    this.encounters = new Map();
    this.lastCleanupAt = 0;
  }

  recordDamage(victim, attacker, damage, now = Date.now()) {
    if (!this.isPlayer(victim) || !this.isPlayer(attacker) || victim === attacker) return;
    if (!Number.isFinite(damage) || damage <= 0) return;

    let attackers = this.damageLedger.get(victim.id);
    if (!attackers) {
      attackers = new Map();
      this.damageLedger.set(victim.id, attackers);
    }

    const entry = attackers.get(attacker.id) || { damage: 0, lastHitAt: now };
    entry.damage += damage;
    entry.lastHitAt = now;
    attackers.set(attacker.id, entry);
  }

  handleKill(victim, killer, now = Date.now()) {
    if (!this.isPlayer(victim)) return null;

    const victimStreak = victim.killStreak || 0;
    victim.killStreak = 0;
    victim.bounty = 0;
    victim.lastKilledByKey = this.identity(killer);

    if (!this.isPlayer(killer) || killer === victim) {
      this.damageLedger.delete(victim.id);
      return null;
    }

    killer.killStreak = (killer.killStreak || 0) + 1;
    const repeatMultiplier = this.registerEncounter(killer, victim, now);
    const victimCoins = Math.max(0, Number(victim.levels?.coins) || 0);
    const bounty = this.calculateBounty(victimStreak, victimCoins);
    const bountyAward = Math.round(bounty * repeatMultiplier);

    if (bountyAward > 0) killer.levels?.addCoins(bountyAward);
    if (killer.health && !killer.health.isDead) {
      killer.health.gain(killer.health.max.value * this.config.killHealPercent);
    }

    const revenge = killer.lastKilledByKey === this.identity(victim);
    const revengeAward = revenge
      ? Math.round(Math.min(1500, Math.max(50, victimCoins * 0.04)) * repeatMultiplier)
      : 0;
    if (revengeAward > 0) killer.levels?.addCoins(revengeAward);
    killer.lastKilledByKey = null;

    const assists = this.awardAssists(victim, killer, victimCoins, repeatMultiplier, now);
    killer.bounty = this.calculateBounty(killer.killStreak, Number(killer.levels?.coins) || 0);
    this.damageLedger.delete(victim.id);

    return {
      streak: killer.killStreak,
      bountyAward,
      revengeAward,
      repeatMultiplier,
      assists,
    };
  }

  awardAssists(victim, killer, victimCoins, repeatMultiplier, now) {
    const attackers = this.damageLedger.get(victim.id);
    if (!attackers) return [];

    const victimMaxHealth = Math.max(1, Number(victim.health?.max?.value) || 1);
    const awards = [];
    for (const [attackerId, entry] of attackers) {
      if (attackerId === killer.id) continue;
      if (now - entry.lastHitAt > this.config.assistWindowMs) continue;

      const assistant = this.game?.entities?.get(attackerId);
      if (!this.isPlayer(assistant) || assistant.removed) continue;

      const share = Math.min(1, entry.damage / victimMaxHealth);
      if (share < this.config.minimumAssistShare) continue;

      const assistRepeatMultiplier = this.registerEncounter(assistant, victim, now);
      const rewardMultiplier = Math.min(repeatMultiplier, assistRepeatMultiplier);
      const baseAward = Math.min(1000, Math.max(25, victimCoins * 0.025));
      const coins = Math.round(baseAward * share * rewardMultiplier);
      if (coins > 0) assistant.levels?.addCoins(coins);
      assistant.assists = (assistant.assists || 0) + 1;
      awards.push({ playerId: assistant.id, coins, share });
    }
    return awards;
  }

  calculateBounty(streak, coins) {
    if (streak < 3) return 0;
    const safeCoins = Math.max(0, Number(coins) || 0);
    return Math.round(Math.min(10000, streak * streak * 85 + safeCoins * 0.006));
  }

  registerEncounter(killer, victim, now) {
    const key = `${this.identity(killer)}>${this.identity(victim)}`;
    const cutoff = now - this.config.encounterWindowMs;
    const recent = (this.encounters.get(key) || []).filter(timestamp => timestamp >= cutoff);
    const index = Math.min(recent.length, this.config.repeatRewardMultipliers.length - 1);
    recent.push(now);
    this.encounters.set(key, recent);
    return this.config.repeatRewardMultipliers[index];
  }

  identity(player) {
    if (!player) return 'world';
    if (player.client?.account?.id) return `account:${player.client.account.id}`;
    if (player.client?.ip) return `ip:${player.client.ip}`;
    return `entity:${player.id}`;
  }

  isPlayer(entity) {
    return !!entity && entity.type === Types.Entity.Player;
  }

  update(now = Date.now()) {
    if (now - this.lastCleanupAt < this.config.ledgerCleanupIntervalMs) return;
    this.lastCleanupAt = now;

    const damageCutoff = now - this.config.assistWindowMs;
    for (const [victimId, attackers] of this.damageLedger) {
      for (const [attackerId, entry] of attackers) {
        if (entry.lastHitAt < damageCutoff) attackers.delete(attackerId);
      }
      if (attackers.size === 0) this.damageLedger.delete(victimId);
    }

    const encounterCutoff = now - this.config.encounterWindowMs;
    for (const [key, timestamps] of this.encounters) {
      const recent = timestamps.filter(timestamp => timestamp >= encounterCutoff);
      if (recent.length === 0) this.encounters.delete(key);
      else this.encounters.set(key, recent);
    }
  }

  forgetPlayer(player) {
    if (!player) return;
    this.damageLedger.delete(player.id);
    for (const attackers of this.damageLedger.values()) attackers.delete(player.id);
  }

  handleCommand(player, rawMessage) {
    if (typeof rawMessage !== 'string' || !rawMessage.startsWith('/')) return false;

    const now = Date.now();
    if (now - (player.lastCommandAt || 0) < 500) return true;
    player.lastCommandAt = now;

    const command = rawMessage.trim().toLowerCase().split(/\s+/, 1)[0];
    switch (command) {
      case '/help':
        player.setSystemMessage('/stats /dash /bounty /players /event /valor /valor top');
        return true;
      case '/stats':
        player.setSystemMessage(`K ${player.kills} A ${player.assists} streak ${player.killStreak}`);
        return true;
      case '/dash':
        player.setSystemMessage(`Dash: ${player.dash.status} (double-tap movement)`);
        return true;
      case '/bounty':
        player.setSystemMessage(`Bounty: ${Math.round(player.bounty || 0)} coins`);
        return true;
      case '/players':
        player.setSystemMessage(`${this.game.players.size}/${this.game.maxPlayers} players online`);
        return true;
      default:
        player.setSystemMessage('Unknown command. Try /help');
        return true;
    }
  }
}

CombatDirector.DEFAULTS = DEFAULTS;

module.exports = CombatDirector;
