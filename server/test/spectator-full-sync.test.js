const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../src/game/Game');

function makeEntity(id, isStatic) {
  return {
    id,
    isStatic,
    type: 1,
    state: { get: () => ({ id, type: 1 }) },
  };
}

function makeGame() {
  const staticEntity = makeEntity(1, true);
  const dynamicEntity = makeEntity(2, false);
  return {
    entities: new Map([[1, staticEntity], [2, dynamicEntity]]),
    map: { getData: () => ({ staticObjects: [{ id: 1, type: 1 }] }) },
    globalEntities: { getAll: () => ({}) },
    getAllEntities: Game.prototype.getAllEntities,
  };
}

test('spectator full sync sends static entities only through mapData', () => {
  const game = makeGame();
  const spectator = {
    id: 99,
    isSpectating: true,
    state: { get: () => ({ x: 0, y: 0 }) },
    getEntitiesInViewport: () => [1, 2],
  };
  const client = { spectator, player: null, fullSync: true };

  const payload = Game.prototype.createPayload.call(game, client);

  assert.equal(payload.mapData.staticObjects.length, 1);
  assert.equal(payload.entities[1], undefined);
  assert.equal(payload.entities[2].id, 2);
});

test('player full sync still includes static entities', () => {
  const game = makeGame();
  const player = {
    id: 7,
    getEntitiesInViewport: () => [1, 2],
  };
  const client = {
    spectator: { isSpectating: false },
    player,
    fullSync: true,
  };

  const payload = Game.prototype.createPayload.call(game, client);

  assert.equal(payload.mapData, undefined);
  assert.equal(payload.entities[1].id, 1);
  assert.equal(payload.entities[2].id, 2);
});
