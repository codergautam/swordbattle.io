const test = require('node:test');
const assert = require('node:assert/strict');
const { BoidsController, CappedFlockRegistry } = require('../src/game/ai/Boids');
const GameMap = require('../src/game/GameMap');
const Types = require('../src/game/Types');

function agent(id, x, y, vx = 0, vy = 0) {
  return {
    id,
    position: { x, y },
    velocity: { x: vx, y: vy },
    maxSpeed: 20,
    radius: 50,
  };
}

test('separation pushes overlapping wolves apart deterministically', () => {
  const controller = new BoidsController({ alignmentWeight: 0, cohesionWeight: 0 });
  const first = controller.steer(agent(1, 0, 0), [agent(2, 0, 0)]);
  const second = controller.steer(agent(2, 0, 0), [agent(1, 0, 0)]);
  const repeated = controller.steer(agent(1, 0, 0), [agent(2, 0, 0)]);
  assert.deepEqual(first, repeated);
  assert.equal(first.neighborCount, 1);
  assert.ok(Math.hypot(first.x, first.y) > 0);
  assert.ok(Math.abs(first.x + second.x) < 1e-9);
  assert.ok(Math.abs(first.y + second.y) < 1e-9);
});

test('alignment and cohesion include every nearby wolf without pack IDs', () => {
  const controller = new BoidsController({
    separationWeight: 0,
    alignmentWeight: 1,
    cohesionWeight: 1,
    wanderWeight: 0,
  });
  const steering = controller.steer(agent(1, 0, 0), [
    agent(2, 400, 0, 10, 0),
    agent(3, 500, 100, 10, 0),
    agent(4, 2000, 0, -10, 0),
  ]);
  assert.equal(steering.neighborCount, 2);
  assert.ok(steering.x > 0);
});

test('steering is capped and turns wolves back from world edges', () => {
  const controller = new BoidsController({ maxForce: 1.75 });
  const steering = controller.steer(agent(1, -95, 0, -20, 0), [], {
    bounds: { minX: -100, minY: -100, maxX: 100, maxY: 100, margin: 30 },
  });
  assert.ok(steering.x > 0);
  assert.ok(Math.hypot(steering.x, steering.y) <= 1.750001);
});

test('wolf pack spawning always creates exactly three nearby members', () => {
  const definitions = [];
  const fakeMap = {
    addEntity(definition) {
      definitions.push(definition);
      return {
        shape: { x: 120, y: 340, radius: 55 },
      };
    },
  };
  fakeMap.nextWolfFlockId = 1;
  const input = { type: Types.Entity.Wolf, packSize: 7, respawnable: true };
  const leader = GameMap.prototype.addWolfPack.call(fakeMap, input);
  assert.ok(leader);
  assert.equal(definitions.length, 3);
  assert.ok(definitions.every(definition => definition.wolfPackMember === true));
  assert.ok(definitions.every(definition => definition.wolfFlockId === 1));
  assert.ok(definitions.slice(1).every(definition => definition.spacingGroup === false));
  assert.deepEqual(definitions[1].packAnchor, { x: 120, y: 340, radius: 55 });
  assert.equal(input.wolfPackMember, undefined);
});

test('each wolf map spawn creates three independent packs', () => {
  const packCalls = [];
  const fakeMap = {
    addWolfPack(definition) {
      packCalls.push(definition);
      return { id: packCalls.length };
    },
  };
  const input = { type: Types.Entity.Wolf, respawnable: true };
  const firstLeader = GameMap.prototype.addWolfPacks.call(fakeMap, input);
  assert.equal(firstLeader.id, 1);
  assert.equal(packCalls.length, 3);
  assert.ok(packCalls.every(definition => definition === input));
});

test('three groups of three randomly merge into eight plus one stable cast-out', () => {
  const samples = [0.82, 0.13, 0.64, 0.37, 0.91, 0.26, 0.55, 0.04];
  let sampleIndex = 0;
  const registry = new CappedFlockRegistry(8, () => samples[sampleIndex++ % samples.length]);
  for (let id = 1; id <= 3; id += 1) registry.ensure(id, 100);
  for (let id = 4; id <= 6; id += 1) registry.ensure(id, 200);
  for (let id = 7; id <= 9; id += 1) registry.ensure(id, 300);

  assert.equal(registry.tryMerge(1, 4), true);
  assert.equal(registry.sizeOf(1), 6);
  registry.tryMerge(1, 7);

  const sizes = Array.from({ length: 9 }, (_, index) => registry.sizeOf(index + 1));
  assert.equal(sizes.filter(size => size === 8).length, 8);
  assert.equal(sizes.filter(size => size === 1).length, 1);

  const fullFlockWolf = sizes.findIndex(size => size === 8) + 1;
  const castOutWolf = sizes.findIndex(size => size === 1) + 1;
  assert.equal(registry.tryMerge(fullFlockWolf, castOutWolf), false);
  assert.equal(registry.sizeOf(fullFlockWolf), 8);
  assert.equal(registry.sizeOf(castOutWolf), 1);
});

test('cast-out selection follows the injected random source', () => {
  function castOutFor(sample) {
    const registry = new CappedFlockRegistry(8, () => sample);
    for (let id = 1; id <= 3; id += 1) registry.ensure(id, 100);
    for (let id = 4; id <= 6; id += 1) registry.ensure(id, 200);
    for (let id = 7; id <= 9; id += 1) registry.ensure(id, 300);
    registry.tryMerge(1, 4);
    registry.tryMerge(1, 7);
    return Array.from({ length: 9 }, (_, index) => registry.sizeOf(index + 1))
      .findIndex(size => size === 1) + 1;
  }

  assert.notEqual(castOutFor(0.01), castOutFor(0.99));
});
