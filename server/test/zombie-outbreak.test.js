const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../src/game/Game');
const Types = require('../src/game/Types');
const WorldEventDirector = require('../src/game/components/WorldEventDirector');

function player(id, { safe = false, account = id } = {}) {
  return {
    id, type: Types.Entity.Player, isBot: false, removed: false, inSafezone: safe,
    shape: { x: id * 50, y: id * 80 }, cards: { isTutorial: false },
    client: { id: `client-${id}`, account: account ? { id: account, valorCrests: 0 } : null },
    messages: [], setSystemMessage(message) { this.messages.push(message); },
  };
}

function fixture(random = () => 0) {
  const game = new Game();
  game.maxEntities = 1000;
  game.map.x = -10000;
  game.map.y = -10000;
  game.map.width = 20000;
  game.map.height = 20000;
  game.map.safezone = null;
  game.map.tutorialSafezone = null;
  game.map.aiPlayersCount = 4;
  game.map.entityTimers.clear();
  game.players.clear();
  game.entities.clear();
  game.newEntities.clear();
  game.idPool = new (require('../src/game/components/IdPool'))();
  const director = new WorldEventDirector(game, { random });
  game.worldEventDirector = director;
  return { game, director };
}

test('outbreak warning uses active eligible play and spawns an exact 16/3/1 ring', () => {
  const { game, director } = fixture();
  const p = player(7);
  game.players.add(p);
  director.update(12 * 60 - 1);
  assert.equal(director.phase, WorldEventDirector.PHASE.IDLE);
  director.update(1);
  assert.equal(director.phase, WorldEventDirector.PHASE.WARNING);
  director.update(20);
  assert.equal(director.phase, WorldEventDirector.PHASE.ACTIVE);
  const zombies = Array.from(game.entities.values()).filter(e => e.type === Types.Entity.Zombie);
  assert.equal(zombies.length, 20);
  assert.deepEqual(zombies.reduce((counts, z) => ({ ...counts, [z.variant]: (counts[z.variant] || 0) + 1 }), {}), { 1: 16, 2: 3, 3: 1 });
  assert.ok(zombies.every(z => Math.abs(Math.hypot(z.shape.x - p.shape.x, z.shape.y - p.shape.y) - 1200) < 1e-6));
});

test('safe players defer their whole ring, late joins get one, and capacity never truncates', () => {
  const { game, director } = fixture();
  const outside = player(1);
  const sheltered = player(2, { safe: true });
  game.players.add(outside);
  game.players.add(sheltered);
  director.beginOutbreak();
  assert.equal(director.zombieIds.size, 20);
  sheltered.inSafezone = false;
  game.maxEntities = game.entities.size + 39;
  director.update(0.2);
  assert.equal(director.zombieIds.size, 20);
  game.maxEntities += 1;
  director.update(0.2);
  assert.equal(director.zombieIds.size, 40);
  director.update(0.2);
  assert.equal(director.zombieIds.size, 40);

  const late = player(3);
  game.players.add(late);
  game.maxEntities += 40;
  director.update(0.2);
  assert.equal(director.zombieIds.size, 60);
});

test('victory and timeout remove survivors, restore NPC settings, and reschedule', () => {
  const { game, director } = fixture(() => 0.5);
  const p = player(1);
  game.players.add(p);
  director.beginOutbreak();
  assert.equal(game.map.aiPlayersCount, 0);
  for (const id of director.zombieIds) game.removeEntity(game.entities.get(id));
  director.update(0.1);
  assert.equal(director.phase, WorldEventDirector.PHASE.IDLE);
  assert.equal(director.lastResult.success, true);
  assert.equal(game.map.aiPlayersCount, 4);
  assert.ok(director.nextAt >= 12 * 60 && director.nextAt <= 18 * 60);

  director.beginOutbreak();
  director.update(8 * 60);
  assert.equal(director.lastResult.success, false);
  assert.equal(Array.from(game.entities.values()).filter(e => e.type === Types.Entity.Zombie).length, 0);
  assert.equal(game.map.aiPlayersCount, 4);
});

test('contributions exclude guests and choose a deterministic signed-in MVP', () => {
  const { game, director } = fixture();
  const first = player(1, { account: 10 });
  const second = player(2, { account: 20 });
  const guest = player(3, { account: null });
  game.players.add(first); game.players.add(second); game.players.add(guest);
  director.phase = WorldEventDirector.PHASE.ACTIVE;
  director.eventId = '11111111-1111-4111-8111-111111111111';
  director.recordContribution(first, 250, true);
  director.recordContribution(second, 210, true);
  director.recordContribution(second, 1, true);
  director.recordContribution(guest, 500, true);
  let payload;
  director.postAwardsWithRetry = value => { payload = value; };
  director.awardValor(director.eventId);
  assert.deepEqual(payload.awards, [
    { accountId: 10, crests: 6, zombieKills: 1, mvp: true },
    { accountId: 20, crests: 5, zombieKills: 2, mvp: false },
  ]);
});

test('death/respawn identity cannot receive a duplicate ring and NPC population is restored', () => {
  const { game, director } = fixture();
  const firstLife = player(1, { account: 44 });
  const bot = { id: 700, type: Types.Entity.Player, isBot: true, removed: false, originalDefinition: { type: Types.Entity.Player, isPlayer: true } };
  game.players.add(firstLife);
  game.players.add(bot);
  game.entities.set(bot.id, bot);
  let restoredBots = 0;
  game.map.spawnPlayerBot = () => { restoredBots += 1; };
  director.beginOutbreak();
  assert.equal(director.zombieIds.size, 20);
  assert.equal(game.entities.has(bot.id), false);

  game.players.delete(firstLife);
  const respawn = player(99, { account: 44 });
  game.players.add(respawn);
  director.update(0.2);
  assert.equal(director.zombieIds.size, 20);
  director.update(8 * 60);
  assert.equal(restoredBots, 1);
});

test('ZombieBrain targets humans, leads throws, dodges trajectories, and uses retreat hysteresis', () => {
  const { game } = fixture();
  const Zombie = require('../src/game/entities/Zombie');
  const z = new Zombie(game, 2, 'test');
  z.id = 101;
  z.shape.x = 0; z.shape.y = 0;
  const human = player(9);
  human.shape.x = 900; human.shape.y = 0;
  human.velocity = { x: 0, y: 180 };
  game.players.add(human);
  game.entitiesQuadtree = { get: () => [] };
  z.brain.decide();
  assert.equal(z.brain.target, human);
  assert.ok(z.brain.aimAngle > 0);
  z.health.percent = 0.24;
  z.brain.decide();
  assert.equal(z.brain.retreating, true);
  z.health.percent = 0.30;
  z.brain.decide();
  assert.equal(z.brain.retreating, true);
  z.health.percent = 0.36;
  z.brain.decide();
  assert.equal(z.brain.retreating, false);

  const projectile = { type: Types.Entity.ThrownSword, shape: { x: -300, y: 0 }, velocity: { x: 600, y: 0 } };
  game.entitiesQuadtree = { get: () => [{ entity: projectile }] };
  assert.ok(Math.abs(Math.abs(z.brain.projectileDodge()) - Math.PI / 2) < 1e-6);
});
