const test = require('node:test');
const assert = require('node:assert/strict');
const BotSocialSystem = require('../src/game/components/BotSocialSystem');
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
