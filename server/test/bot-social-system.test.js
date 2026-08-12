const test = require('node:test');
const assert = require('node:assert/strict');
const BotSocialSystem = require('../src/game/components/BotSocialSystem');
const BotDialogue = require('../src/game/components/BotDialogue');
const Types = require('../src/game/Types');

function bot(id, x, health = 1) {
  const entity = {
    id, isBot: true, removed: false, shape: { x, y: 0 },
    health: { percent: health, isDead: false },
    botTeamId: null, botTeammateId: null, target: null,
    messages: [], addChatMessage(message) { this.messages.push(message); },
    abandonGoal() { this.target = null; },
  };
  return entity;
}

function connect(...bots) {
  const entities = new Map(bots.map(entity => [entity.id, entity]));
  const game = { entities };
  for (const entity of bots) entity.game = game;
}

test('nearby full-health NPC players chat and form a two-bot team', () => {
  const first = bot(1, 0);
  const second = bot(2, 300);
  connect(first, second);
  first.social = new BotSocialSystem(first, { random: () => 0, formationDelay: 0 });
  second.social = new BotSocialSystem(second, { random: () => 0, formationDelay: 0 });
  first.social.update(0.05, [second]);
  assert.equal(first.botTeamId, 'bot-team:1:2');
  assert.equal(second.botTeamId, first.botTeamId);
  assert.equal(first.botTeammateId, 2);
  assert.equal(second.botTeammateId, 1);
  assert.equal(first.messages.length, 1);
  assert.equal(second.messages.length, 1);
  assert.equal(first.social.isTeammate(second), true);
});

test('injured NPC players cannot create teams', () => {
  const first = bot(1, 0, 0.99);
  const second = bot(2, 200);
  connect(first, second);
  first.social = new BotSocialSystem(first, { random: () => 0, formationDelay: 0 });
  first.social.update(0.05, [second]);
  assert.equal(first.botTeamId, null);
  assert.equal(second.botTeamId, null);
});

test('teammates share combat targets and disband when one is removed', () => {
  const first = bot(1, 0);
  const second = bot(2, 200);
  connect(first, second);
  first.social = new BotSocialSystem(first, { random: () => 0, formationDelay: 0 });
  second.social = new BotSocialSystem(second, { random: () => 0, formationDelay: 0 });
  first.social.formTeam(second);
  const enemy = { id: 3, removed: false, type: Types.Entity.Player };
  second.target = enemy;
  assert.equal(first.social.sharedCombatTarget(), enemy);
  second.removed = true;
  first.social.update(0.05, [second]);
  assert.equal(first.botTeamId, null);
});

test('attacked NPC players answer with cooldown-limited combat dialogue', () => {
  const victim = bot(1, 0);
  const attacker = { id: 2, type: Types.Entity.Player, removed: false };
  connect(victim);
  victim.social = new BotSocialSystem(victim, { random: () => 0 });

  assert.equal(victim.social.onAttacked(attacker), true);
  assert.deepEqual(victim.messages, ['Stop attacking me!']);
  assert.equal(victim.social.onAttacked(attacker), false);

  victim.social.update(1.99, []);
  assert.equal(victim.social.onAttacked(attacker), false);
  victim.social.update(0.02, []);
  assert.equal(victim.social.onAttacked(attacker), true);
  assert.equal(victim.messages.length, 2);
});

test('NPC players do not threaten their teammates', () => {
  const victim = bot(1, 0);
  const teammate = bot(2, 10);
  connect(victim, teammate);
  victim.social = new BotSocialSystem(victim, { random: () => 0 });
  victim.social.formTeam(teammate);
  victim.messages.length = 0;

  assert.equal(victim.social.onAttacked(teammate), false);
  assert.deepEqual(victim.messages, []);
});

test('NPC dialogue catalog contains over 200 unique contextual lines', () => {
  const lines = Object.values(BotDialogue.dialogue).flat();
  assert.ok(BotDialogue.totalLines > 200);
  assert.equal(new Set(lines).size, lines.length);
  for (const category of ['attacked', 'lowHealth', 'flee', 'challenge', 'mob', 'boss', 'coins', 'ore', 'chest', 'wander', 'ability', 'victory', 'formation', 'reply', 'team']) {
    assert.ok(BotDialogue.dialogue[category].length >= 20, `${category} needs variety`);
  }
  assert.ok(lines.every(line => line.length <= 60), 'network chat lines stay within the 60-character limit');
});

test('NPC situational dialogue is throttled while victories can interrupt it', () => {
  const npc = bot(1, 0);
  connect(npc);
  npc.social = new BotSocialSystem(npc, { random: () => 0 });
  npc.social.situationChatCooldown = 0;

  assert.equal(npc.social.onSituation('coins'), true);
  assert.equal(npc.social.onSituation('boss'), false);
  assert.equal(npc.social.onVictory(), true);
  assert.equal(npc.messages.length, 2);
});
