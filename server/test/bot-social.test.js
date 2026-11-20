const test = require('node:test');
const assert = require('node:assert/strict');
const { BotSocialGraph } = require('../src/game/ai/BotSocial');
const { BotPersonality } = require('../src/game/ai/BotPersonality');

function bot(id, personality = BotPersonality.Regular, aggression = 0.5) {
  return { id, isBot: true, personality, aggression, removed: false };
}

test('team and neutral relations prevent accidental bot targeting', () => {
  const graph = new BotSocialGraph();
  const a = bot(1);
  const b = bot(2);
  assert.equal(graph.setRelation(a, b, 'team'), true);
  assert.equal(graph.relation(a, b), 'team');
  assert.equal(graph.relation(b, a), 'team');
  assert.equal(graph.canAttack(a, b), false);
  graph.turnHostile(a, b);
  assert.equal(graph.relation(a, b), 'rival');
  assert.equal(graph.canAttack(a, b), true);
});

test('runner social choices favor neutrality', () => {
  const graph = new BotSocialGraph();
  const runner = bot(3, BotPersonality.Runner);
  assert.equal(graph.chooseRelation(runner, bot(4), () => 0.5), 'neutral');
});
