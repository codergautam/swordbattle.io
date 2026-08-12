const test = require('node:test');
const assert = require('node:assert/strict');
const WorldIndex = require('../src/game/components/WorldIndex');
const { rectangleRectangle } = require('../src/game/collisions');

function entity(id, x, y, width, height, isStatic = false, type = 0) {
  return {
    id,
    type,
    isStatic,
    removed: false,
    shape: { get boundary() { return { x, y, width, height }; } },
    move(nextX, nextY) { x = nextX; y = nextY; },
  };
}

test('WorldIndex type queries retain exact filtering, deduplication, and optional stable order', () => {
  const index = new WorldIndex({ x: 0, y: 0, width: 4096, height: 4096 }, 512);
  const entities = new Map([
    [9, entity(9, 100, 100, 900, 900, true, 2)],
    [3, entity(3, 300, 300, 80, 80, false, 1)],
    [7, entity(7, 350, 350, 80, 80, false, 2)],
    [5, entity(5, 360, 360, 80, 80, false, 3)],
  ]);
  index.sync(entities);

  const query = { x: 250, y: 250, width: 500, height: 500 };
  assert.deepEqual(index.getByTypes(query, new Set([1, 2])).map(r => r.entity.id), [3, 7, 9]);
  assert.deepEqual(index.getByTypes(query, new Set([3])).map(r => r.entity.id), [5]);
  assert.deepEqual(index.getByTypes(query, new Set([99])).map(r => r.entity.id), []);

  entities.get(7).move(3000, 3000);
  index.sync(entities);
  assert.deepEqual(index.getByTypes(query, new Set([2])).map(r => r.entity.id), [9]);
  index.remove(9);
  assert.deepEqual(index.getByTypes(query, new Set([2])).map(r => r.entity.id), []);
});

test('WorldIndex exactly matches brute force queries in deterministic ID order', () => {
  const index = new WorldIndex({ x: -2048, y: -2048, width: 4096, height: 4096 }, 512);
  const entities = new Map();
  let seed = 123456789;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let id = 1; id <= 500; id++) {
    const width = 10 + Math.floor(random() * 900);
    const height = 10 + Math.floor(random() * 900);
    const item = entity(
      id,
      -2000 + Math.floor(random() * (4000 - width)),
      -2000 + Math.floor(random() * (4000 - height)),
      width,
      height,
      id % 4 === 0,
    );
    entities.set(id, item);
  }
  index.sync(entities);

  for (let queryId = 0; queryId < 200; queryId++) {
    const query = {
      x: -2100 + Math.floor(random() * 4000),
      y: -2100 + Math.floor(random() * 4000),
      width: 1 + Math.floor(random() * 1000),
      height: 1 + Math.floor(random() * 1000),
    };
    const actual = index.get(query).map(result => result.entity.id);
    const expected = [...entities.values()]
      .filter(item => rectangleRectangle(item.shape.boundary, query))
      .map(item => item.id)
      .sort((left, right) => left - right);
    assert.deepEqual(actual, expected);
  }
});

test('WorldIndex updates movement, static transitions, insertion, and removal', () => {
  const index = new WorldIndex({ x: 0, y: 0, width: 4096, height: 4096 }, 512);
  const moving = entity(2, 50, 50, 80, 80);
  const large = entity(1, 400, 400, 900, 900, true);
  const entities = new Map([[2, moving], [1, large]]);
  index.sync(entities);

  assert.deepEqual(index.get({ x: 0, y: 0, width: 600, height: 600 }).map(r => r.entity.id), [1, 2]);
  moving.move(3000, 3000);
  moving.isStatic = true;
  index.sync(entities);
  assert.deepEqual(index.get({ x: 0, y: 0, width: 200, height: 200 }).map(r => r.entity.id), []);
  assert.deepEqual(index.get({ x: 2950, y: 2950, width: 200, height: 200 }).map(r => r.entity.id), [2]);

  entities.delete(1);
  index.sync(entities);
  assert.equal(index.records.has(1), false);
  const added = entity(3, 10, 10, 20, 20);
  entities.set(3, added);
  index.upsertEntity(added);
  assert.deepEqual(index.get({ x: 0, y: 0, width: 40, height: 40 }).map(r => r.entity.id), [3]);
});

test('WorldIndex handles exact cell edges, very large bounds, and removals during result iteration', () => {
  const index = new WorldIndex({ x: -2048, y: -2048, width: 4096, height: 4096 }, 512);
  const edgeLeft = entity(9, 0, 0, 512, 512, true);
  const edgeRight = entity(3, 512, 512, 1, 1);
  const spanningPolygonBounds = entity(7, -1536, -900, 3072, 1800, true);
  const entities = new Map([[9, edgeLeft], [3, edgeRight], [7, spanningPolygonBounds]]);
  index.sync(entities);

  assert.deepEqual(index.get({ x: 512, y: 512, width: 0, height: 0 }).map(r => r.entity.id), [3, 7, 9]);
  assert.deepEqual(index.get({ x: 1400, y: -10, width: 20, height: 20 }).map(r => r.entity.id), [7]);

  const results = index.get({ x: -2048, y: -2048, width: 4096, height: 4096 });
  for (const result of results) index.remove(result.entity);
  assert.equal(index.records.size, 0);
  assert.deepEqual(index.get({ x: -2048, y: -2048, width: 4096, height: 4096 }), []);
});
