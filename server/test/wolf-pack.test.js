const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../src/game/Game');
const Types = require('../src/game/Types');
const IdPool = require('../src/game/components/IdPool');
const WorldIndex = require('../src/game/components/WorldIndex');

function fixture() {
  const game = new Game();
  game.maxEntities = 100;
  game.entities.clear();
  game.newEntities.clear();
  game.players.clear();
  game.idPool = new IdPool();
  game.map.x = -5000; game.map.y = -5000;
  game.map.width = 10000; game.map.height = 10000;
  game.map.halfWidth = 5000; game.map.halfHeight = 5000;
  game.entitiesQuadtree = new WorldIndex({ x: -5000, y: -5000, width: 10000, height: 10000 });
  return game;
}

test('wolves spawn in a nearby pack without changing health or speed', () => {
  const game = fixture();
  const leader = game.map.addEntity({
    type: Types.Entity.Wolf, position: [0, 0], packSize: 4,
  });
  const wolves = [...game.entities.values()].filter(entity => entity.type === Types.Entity.Wolf);
  assert.equal(wolves.length, 4);
  assert.ok(wolves.every(wolf => wolf.packId === leader.packId));
  assert.ok(wolves.every(wolf => wolf.health.max.value === 75));
  assert.ok(wolves.every(wolf => wolf.speed.baseValue === 22));
  assert.ok(wolves.every(wolf => Math.hypot(wolf.shape.x - leader.shape.x, wolf.shape.y - leader.shape.y) <= 321));
});

test('wolf boids separate, align, cohere, and share pack targets', () => {
  const game = fixture();
  game.map.addEntity({ type: Types.Entity.Wolf, position: [0, 0], packSize: 3 });
  const wolves = [...game.entities.values()].filter(entity => entity.type === Types.Entity.Wolf);
  game.entitiesQuadtree.sync(game.entities);
  wolves[0].shape.x = 0; wolves[0].shape.y = 0;
  wolves[1].shape.x = 30; wolves[1].shape.y = 0;
  wolves[2].shape.x = 500; wolves[2].shape.y = 100;
  wolves[1].velocity.x = 10;
  const target = { removed: false, shape: { x: 900, y: 0 } };
  wolves[2].target = target;
  game.entitiesQuadtree.sync(game.entities);

  wolves[0].applyBoidMovement(0.05);
  assert.equal(wolves[0].target, target);
  assert.ok(Number.isFinite(wolves[0].velocity.x));
  assert.ok(Number.isFinite(wolves[0].velocity.y));
  assert.equal(wolves[0].health.max.value, 75);
  assert.equal(wolves[0].speed.baseValue, 22);
});
