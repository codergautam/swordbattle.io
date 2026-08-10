const test = require('node:test');
const assert = require('node:assert/strict');
const Types = require('../src/game/Types');
const CombatDirector = require('../src/game/components/CombatDirector');

function makePlayer(id, accountId, coins = 0) {
  const player = {
    id,
    type: Types.Entity.Player,
    removed: false,
    killStreak: 0,
    assists: 0,
    bounty: 0,
    lastKilledByKey: null,
    client: { account: { id: accountId }, ip: `10.0.0.${id}` },
    health: {
      isDead: false,
      max: { value: 100 },
      gained: 0,
      gain(amount) { this.gained += amount; },
    },
    levels: {
      coins,
      awarded: 0,
      addCoins(amount) {
        this.awarded += amount;
        this.coins += amount;
      },
    },
    setSystemMessage(message) { this.message = message; },
    dash: { status: 'ready' },
    kills: 0,
  };
  return player;
}

test('kills grant streaks, capped bounty rewards, healing, and assists', () => {
  const killer = makePlayer(1, 101, 1000);
  const victim = makePlayer(2, 202, 20000);
  const assistant = makePlayer(3, 303, 500);
  victim.killStreak = 4;

  const game = { entities: new Map([[1, killer], [2, victim], [3, assistant]]), players: new Set(), maxPlayers: 100 };
  const director = new CombatDirector(game);
  director.recordDamage(victim, killer, 70, 1000);
  director.recordDamage(victim, assistant, 30, 1000);

  const result = director.handleKill(victim, killer, 1500);
  assert.equal(killer.killStreak, 1);
  assert.equal(victim.killStreak, 0);
  assert.ok(result.bountyAward > 0);
  assert.equal(killer.health.gained, 6);
  assert.equal(assistant.assists, 1);
  assert.equal(result.assists.length, 1);
  assert.ok(assistant.levels.awarded > 0);
  assert.equal(director.damageLedger.has(victim.id), false);
});

test('repeat victims rapidly diminish farmable combat rewards', () => {
  const killer = makePlayer(1, 101, 0);
  const victim = makePlayer(2, 202, 10000);
  const game = { entities: new Map([[1, killer], [2, victim]]), players: new Set(), maxPlayers: 100 };
  const director = new CombatDirector(game);

  const multipliers = [];
  for (let i = 0; i < 4; i++) {
    victim.killStreak = 3;
    multipliers.push(director.handleKill(victim, killer, 1000 + i).repeatMultiplier);
  }
  assert.deepEqual(multipliers, [1, 0.55, 0.2, 0]);
});

test('combat commands expose mechanics without changing UI code', () => {
  const player = makePlayer(1, 101, 100);
  player.kills = 5;
  player.assists = 2;
  player.killStreak = 3;
  const game = { entities: new Map([[1, player]]), players: new Set([player]), maxPlayers: 100 };
  const director = new CombatDirector(game);

  assert.equal(director.handleCommand(player, '/stats'), true);
  assert.match(player.message, /K 5 A 2 streak 3/);
  assert.equal(director.handleCommand(player, 'hello'), false);
});
