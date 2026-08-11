const test = require('node:test');
const assert = require('node:assert/strict');
const Health = require('../src/game/components/Health');

test('damage is finite, positive, and capped at remaining health', () => {
  const health = new Health(100, 5, 0);
  assert.equal(health.damaged(-20), 0);
  assert.equal(health.damaged(Number.NaN), 0);
  assert.equal(health.damaged(30), 30);
  assert.equal(health.percent, 0.7);
  assert.equal(health.damaged(500), 70);
  assert.equal(health.percent, 0);
  assert.equal(health.isDead, true);
  assert.equal(health.damaged(10), 0);
});

test('healing cannot revive a dead entity and regeneration stays bounded', () => {
  const health = new Health(100, 10, 0);
  health.damaged(50);
  health.regenWaitUntil = 0;
  health.update(2);
  assert.equal(health.percent, 0.7);
  assert.ok(Math.abs(health.gain(1000) - 30) < 1e-9);
  assert.equal(health.percent, 1);

  health.damaged(100);
  assert.equal(health.gain(50), 0);
  assert.equal(health.percent, 0);
});
