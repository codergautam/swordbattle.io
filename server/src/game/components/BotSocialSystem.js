const Types = require('../Types');
const BotDialogue = require('./BotDialogue');

function distance(left, right) {
  return Math.hypot(left.shape.x - right.shape.x, left.shape.y - right.shape.y);
}

class BotSocialSystem {
  constructor(bot, options = {}) {
    this.bot = bot;
    this.random = options.random || Math.random;
    this.formationRadius = options.formationRadius || 850;
    this.formationTimer = options.formationDelay ?? (1.5 + this.random() * 3);
    this.chatTimer = 10 + this.random() * 12;
    this.attackedChatCooldown = 0;
    this.situationChatCooldown = 3 + this.random() * 4;
  }

  isFullHealth(bot = this.bot) {
    return !!bot?.health && !bot.health.isDead && bot.health.percent >= 0.999999;
  }

  teammate() {
    const teammate = this.bot.game.entities.get(this.bot.botTeammateId);
    if (!teammate || teammate.removed || teammate.botTeamId !== this.bot.botTeamId) return null;
    return teammate;
  }

  isTeammate(other) {
    return !!other && this.bot.botTeamId !== null
      && other.botTeamId === this.bot.botTeamId;
  }

  update(dt, nearbyBots) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.attackedChatCooldown = Math.max(0, this.attackedChatCooldown - dt);
    this.situationChatCooldown = Math.max(0, this.situationChatCooldown - dt);
    if (this.bot.botTeamId !== null) {
      const mate = this.teammate();
      if (!mate) {
        this.bot.botTeamId = null;
        this.bot.botTeammateId = null;
        this.formationTimer = 2 + this.random() * 4;
        return;
      }
      this.chatTimer -= dt;
      if (this.chatTimer <= 0 && distance(this.bot, mate) <= this.formationRadius * 1.5) {
        this.bot.addChatMessage(BotDialogue.pick('team', this.random));
        this.situationChatCooldown = Math.max(this.situationChatCooldown, 2);
        this.chatTimer = 12 + this.random() * 16;
      }
      return;
    }

    this.formationTimer -= dt;
    if (this.formationTimer > 0 || !this.isFullHealth()) return;
    const candidates = (nearbyBots || [])
      .filter(other => other && other !== this.bot && !other.removed
        && other.isBot && other.botTeamId === null && this.isFullHealth(other)
        && distance(this.bot, other) <= this.formationRadius)
      .sort((left, right) => distance(this.bot, left) - distance(this.bot, right) || left.id - right.id);
    if (candidates.length) this.formTeam(candidates[0]);
    else this.formationTimer = 2 + this.random() * 4;
  }

  onAttacked(attacker) {
    if (!attacker || attacker === this.bot || attacker.removed) return false;
    if (attacker.type === Types.Entity.Player && this.isTeammate(attacker)) return false;
    if (this.bot.removed || this.bot.health?.isDead || this.attackedChatCooldown > 0) return false;

    let category = 'attacked';
    if (this.bot.health?.percent <= 0.3) category = 'lowHealth';
    else if (Types.Groups.Mobs.includes(attacker.type)) category = attacker.isGlobal ? 'boss' : 'mob';
    else if (attacker.type !== Types.Entity.Player) return false;

    this.bot.addChatMessage(BotDialogue.pick(category, this.random));
    this.attackedChatCooldown = 2;
    return true;
  }

  onSituation(category) {
    if (this.bot.removed || this.bot.health?.isDead || this.situationChatCooldown > 0) return false;
    this.bot.addChatMessage(BotDialogue.pick(category, this.random));
    this.situationChatCooldown = 7 + this.random() * 8;
    return true;
  }

  onAbility() {
    return this.onSituation('ability');
  }

  onVictory() {
    this.situationChatCooldown = 0;
    return this.onSituation('victory');
  }

  formTeam(other) {
    if (!other || other === this.bot || !this.isFullHealth() || !this.isFullHealth(other)) return false;
    if (this.bot.botTeamId !== null || other.botTeamId !== null) return false;
    const low = Math.min(this.bot.id, other.id);
    const high = Math.max(this.bot.id, other.id);
    const teamId = `bot-team:${low}:${high}`;
    this.bot.botTeamId = teamId;
    this.bot.botTeammateId = other.id;
    other.botTeamId = teamId;
    other.botTeammateId = this.bot.id;
    this.bot.addChatMessage(BotDialogue.pick('formation', this.random));
    other.addChatMessage(BotDialogue.pick('reply', this.random));
    this.situationChatCooldown = Math.max(this.situationChatCooldown, 3);
    if (other.social) other.social.situationChatCooldown = Math.max(other.social.situationChatCooldown, 3);
    this.bot.abandonGoal?.();
    other.abandonGoal?.();
    return true;
  }

  sharedCombatTarget() {
    const mate = this.teammate();
    if (!mate || !mate.target || mate.target.removed || this.isTeammate(mate.target)) return null;
    if (mate.target.type !== Types.Entity.Player && !Types.Groups.Mobs.includes(mate.target.type)) return null;
    return mate.target;
  }

  disband() {
    const mate = this.teammate();
    if (mate) {
      mate.botTeamId = null;
      mate.botTeammateId = null;
    }
    this.bot.botTeamId = null;
    this.bot.botTeammateId = null;
  }
}

module.exports = BotSocialSystem;
