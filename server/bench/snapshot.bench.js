const { performance } = require('node:perf_hooks');
const Protocol = require('../src/network/protocol/Protocol');

const DEFAULT_FULL_SIGNATURE = '99580:796156384';
const DEFAULT_DELTA_SIGNATURE = '12779:4104091516';

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashBytes(bytes) {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function createEntity(id, random, staticEntity = false) {
  const x = Math.floor(random() * 24000);
  const y = Math.floor(random() * 24000);
  return {
    id,
    type: staticEntity ? 9 : 1,
    depth: staticEntity ? id % 8 : 0,
    shapeData: {
      type: staticEntity ? 2 : 1,
      x,
      y,
      angle: random() * Math.PI * 2,
      radius: staticEntity ? 0 : 35 + (id % 20),
      points: staticEntity ? [
        { x, y },
        { x: x + 80 + (id % 40), y },
        { x: x + 80 + (id % 40), y: y + 80 },
        { x, y: y + 80 },
      ] : [],
    },
    healthPercent: 0.25 + random() * 0.75,
    angle: random() * Math.PI * 2,
    size: 100 + (id % 70),
    name: staticEntity ? '' : `BenchmarkPlayer${id}`,
    kills: id % 80,
    level: 1 + (id % 50),
    coins: id * 7,
    tokens: id % 11,
    evolution: id % 6,
    flags: { 1: id % 2, 2: (id + 1) % 2 },
    buffs: { 1: { level: id % 5, max: 5, step: 0.2 } },
    chosenCards: [id % 10, (id + 3) % 10],
  };
}

function createSnapshotFixtures(options = {}) {
  const seed = options.seed || 0x51A7BEEF;
  const dynamicEntityCount = options.dynamicEntityCount || 600;
  const staticEntityCount = options.staticEntityCount || 240;
  const deltaEntityCount = options.deltaEntityCount || 120;
  const random = createRandom(seed);
  const entities = {};
  const staticObjects = [];

  for (let id = 1; id <= dynamicEntityCount; id++) {
    entities[id] = createEntity(id, random, false);
  }
  for (let id = dynamicEntityCount + 1; id <= dynamicEntityCount + staticEntityCount; id++) {
    staticObjects.push(createEntity(id, random, true));
  }

  const deltaEntities = {};
  for (let id = 1; id <= deltaEntityCount; id++) {
    deltaEntities[id] = id % 17 === 0
      ? { id, removed: true }
      : createEntity(id, random, false);
  }

  return {
    full: {
      fullSync: true,
      selfId: 1,
      spectator: { x: 12000, y: 12000 },
      mapData: {
        x: 0,
        y: 0,
        width: 24000,
        height: 24000,
        biomes: [],
        staticObjects,
      },
      // Static objects intentionally exist only in mapData, matching spectator sync.
      entities,
      globalEntities: {},
    },
    delta: {
      entities: deltaEntities,
      globalEntities: {},
    },
  };
}

function benchmarkPayload(name, payload, iterations) {
  let expectedBytes = null;
  let expectedChecksum = null;
  const startedAt = performance.now();
  for (let iteration = 0; iteration < iterations; iteration++) {
    const packet = Protocol.encode(payload);
    const checksum = hashBytes(packet);
    if (expectedBytes === null) {
      expectedBytes = packet.byteLength;
      expectedChecksum = checksum;
    } else if (packet.byteLength !== expectedBytes || checksum !== expectedChecksum) {
      throw new Error(`${name} snapshot encoding became nondeterministic`);
    }
  }
  const durationMs = performance.now() - startedAt;
  return {
    name,
    iterations,
    packetBytes: expectedBytes,
    checksum: expectedChecksum,
    totalMs: Number(durationMs.toFixed(3)),
    meanMs: Number((durationMs / iterations).toFixed(3)),
  };
}

function runSnapshotBenchmark(options = {}) {
  const iterations = options.iterations || 100;
  const fixtures = createSnapshotFixtures(options);
  const full = benchmarkPayload('full', fixtures.full, iterations);
  const delta = benchmarkPayload('delta', fixtures.delta, iterations);
  const usesDefaultFixture = options.seed === undefined
    && options.dynamicEntityCount === undefined
    && options.staticEntityCount === undefined
    && options.deltaEntityCount === undefined;
  if (usesDefaultFixture) {
    const fullSignature = `${full.packetBytes}:${full.checksum}`;
    const deltaSignature = `${delta.packetBytes}:${delta.checksum}`;
    if (fullSignature !== DEFAULT_FULL_SIGNATURE || deltaSignature !== DEFAULT_DELTA_SIGNATURE) {
      throw new Error(
        `Snapshot behavior drifted: ${fullSignature}/${deltaSignature} != `
        + `${DEFAULT_FULL_SIGNATURE}/${DEFAULT_DELTA_SIGNATURE}`,
      );
    }
  }
  return {
    benchmark: 'snapshot',
    seed: options.seed || 0x51A7BEEF,
    full,
    delta,
  };
}

if (require.main === module) {
  console.log(JSON.stringify(runSnapshotBenchmark(), null, 2));
}

module.exports = {
  benchmarkPayload,
  createSnapshotFixtures,
  hashBytes,
  runSnapshotBenchmark,
};
