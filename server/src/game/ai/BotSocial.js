const { BotPersonality } = require('./BotPersonality');

const graphs = new WeakMap();

function pairKey(a, b) {
  const aid = Number(a.id);
  const bid = Number(b.id);
  return aid < bid ? `${aid}:${bid}` : `${bid}:${aid}`;
}

class BotSocialGraph {
  constructor() {
    this.relations = new Map();
  }

  relation(a, b) {
    if (!a || !b || a.id == null || b.id == null) return null;
    return this.relations.get(pairKey(a, b)) || null;
  }

  setRelation(a, b, relation) {
    if (!a || !b || a === b || a.id == null || b.id == null) return false;
    const key = pairKey(a, b);
    if (this.relations.has(key)) return false;
    this.relations.set(key, relation);
    return true;
  }

  chooseRelation(a, b, random = Math.random) {
    if (a.personality === BotPersonality.Runner || b.personality === BotPersonality.Runner) {
      return random() < 0.72 ? 'neutral' : 'rival';
    }
    const cooperation = (2 - a.aggression - b.aggression) * 0.28;
    const roll = random();
    if (roll < cooperation) return 'team';
    if (roll < cooperation + 0.35) return 'neutral';
    return 'rival';
  }

  teamMembers(bot, players) {
    const members = [];
    for (const player of players) {
      if (player !== bot && player.isBot && !player.removed && this.relation(bot, player) === 'team') {
        members.push(player);
      }
    }
    return members;
  }

  canAttack(a, b) {
    const relation = this.relation(a, b);
    return relation !== 'team' && relation !== 'neutral';
  }

  turnHostile(a, b) {
    if (!a || !b || a.id == null || b.id == null) return;
    this.relations.set(pairKey(a, b), 'rival');
  }

  remove(bot) {
    if (!bot || bot.id == null) return;
    const needle = String(bot.id);
    for (const key of this.relations.keys()) {
      const parts = key.split(':');
      if (parts[0] === needle || parts[1] === needle) this.relations.delete(key);
    }
  }
}

function forGame(game) {
  let graph = graphs.get(game);
  if (!graph) {
    graph = new BotSocialGraph();
    graphs.set(game, graph);
  }
  return graph;
}

module.exports = { BotSocialGraph, forGame, pairKey };
