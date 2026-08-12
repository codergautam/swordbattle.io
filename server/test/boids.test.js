const test = require('node:test');
const assert = require('node:assert/strict');
const { BoidsController } = require('../src/game/ai/Boids');
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

test('wolf pack spawning creates one leader and the requested nearby members', () => {
  const definitions = [];
  const fakeMap = {
    addEntity(definition) {
      definitions.push(definition);
      return {
        shape: { x: 120, y: 340, radius: 55 },
      };
    },
  };
  const input = { type: Types.Entity.Wolf, packSize: 4, respawnable: true };
  const leader = GameMap.prototype.addWolfPack.call(fakeMap, input);
  assert.ok(leader);
  assert.equal(definitions.length, 4);
  assert.ok(definitions.every(definition => definition.wolfPackMember === true));
  assert.ok(definitions.slice(1).every(definition => definition.spacingGroup === false));
  assert.deepEqual(definitions[1].packAnchor, { x: 120, y: 340, radius: 55 });
  assert.equal(input.wolfPackMember, undefined);
});
