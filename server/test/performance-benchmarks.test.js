const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createCollisionFixture,
  executeCollisionPass,
} = require('../bench/collision.bench');
const {
  createSnapshotFixtures,
  hashBytes,
} = require('../bench/snapshot.bench');
const Protocol = require('../src/network/protocol/Protocol');

test('collision fixture produces a deterministic candidate and hit signature', () => {
  const fixture = createCollisionFixture({
    seed: 1234,
    entityCount: 250,
    queryCount: 100,
    worldSize: 4000,
  });
  const first = executeCollisionPass(fixture);
  const second = executeCollisionPass(fixture);

  assert.equal(second.candidateCount, first.candidateCount);
  assert.equal(second.exactHitCount, first.exactHitCount);
  assert.equal(second.checksum, first.checksum);
  assert.equal(first.candidateCount, first.exactHitCount);
  assert.equal(first.exactHitCount, 787);
  assert.equal(first.checksum, 880840297);
  assert.ok(first.exactHitCount > 0);
});

test('snapshot fixture encodes to identical bytes on every run', () => {
  const fixtures = createSnapshotFixtures({
    seed: 5678,
    dynamicEntityCount: 40,
    staticEntityCount: 15,
    deltaEntityCount: 10,
  });
  const first = Protocol.encode(fixtures.full);
  const second = Protocol.encode(fixtures.full);

  assert.equal(second.byteLength, first.byteLength);
  assert.equal(hashBytes(second), hashBytes(first));
  assert.equal(first.byteLength, 6393);
  assert.equal(hashBytes(first), 1839186294);
  assert.ok(first.byteLength > 0);
});
