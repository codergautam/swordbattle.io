const { performance } = require('node:perf_hooks');
const QuadTree = require('../src/game/components/Quadtree');
const WorldIndex = require('../src/game/components/WorldIndex');
const { rectangleRectangle } = require('../src/game/collisions');

const LEGACY_SIGNATURE = '28329:6120:3015404203';
const WORLD_INDEX_SIGNATURE = '6120:6120:3190863947';

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

function hashInteger(hash, value) {
  hash ^= value >>> 0;
  return Math.imul(hash, 16777619) >>> 0;
}

function createCollisionFixture(options = {}) {
  const entityCount = options.entityCount || 4000;
  const queryCount = options.queryCount || 2000;
  const worldSize = options.worldSize || 24000;
  const random = createRandom(options.seed || 0x5A0BDA7A);
  const rectangles = [];
  const queries = [];

  for (let id = 1; id <= entityCount; id++) {
    const width = 16 + Math.floor(random() * 160);
    const height = 16 + Math.floor(random() * 160);
    rectangles.push({
      x: Math.floor(random() * (worldSize - width)),
      y: Math.floor(random() * (worldSize - height)),
      width,
      height,
      entity: { id },
    });
  }

  for (let index = 0; index < queryCount; index++) {
    const width = 120 + Math.floor(random() * 900);
    const height = 120 + Math.floor(random() * 900);
    queries.push({
      x: Math.floor(random() * (worldSize - width)),
      y: Math.floor(random() * (worldSize - height)),
      width,
      height,
    });
  }

  return { worldSize, rectangles, queries };
}

function executeCollisionPass(fixture, implementation = 'worldIndex') {
  const boundary = {
    x: 0,
    y: 0,
    width: fixture.worldSize,
    height: fixture.worldSize,
  };
  const tree = implementation === 'legacy'
    ? new QuadTree(boundary, 10, 5)
    : new WorldIndex(boundary, 512);

  const buildStartedAt = performance.now();
  for (const rectangle of fixture.rectangles) tree.insert(rectangle);
  const buildMs = performance.now() - buildStartedAt;

  let candidateCount = 0;
  let exactHitCount = 0;
  let checksum = 2166136261;
  const queryStartedAt = performance.now();
  for (let queryIndex = 0; queryIndex < fixture.queries.length; queryIndex++) {
    const query = fixture.queries[queryIndex];
    const candidates = tree.get(query);
    candidateCount += candidates.length;
    checksum = hashInteger(checksum, queryIndex);
    for (const candidate of candidates) {
      if (!rectangleRectangle(candidate, query)) continue;
      exactHitCount += 1;
      checksum = hashInteger(checksum, candidate.entity.id);
    }
  }
  const queryMs = performance.now() - queryStartedAt;

  return { buildMs, queryMs, candidateCount, exactHitCount, checksum };
}

function runCollisionBenchmark(options = {}) {
  const iterations = options.iterations || 5;
  const fixture = createCollisionFixture(options);
  const runImplementation = (implementation) => {
    const samples = [];
    let expected = null;
    for (let iteration = 0; iteration < iterations; iteration++) {
      const sample = executeCollisionPass(fixture, implementation);
      const deterministicSignature = `${sample.candidateCount}:${sample.exactHitCount}:${sample.checksum}`;
      if (expected === null) expected = deterministicSignature;
      if (deterministicSignature !== expected) {
        throw new Error(`${implementation} collision benchmark became nondeterministic`);
      }
      samples.push(sample);
    }
    const average = (key) => samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;
    return {
      signature: expected,
      buildMeanMs: Number(average('buildMs').toFixed(3)),
      queryMeanMs: Number(average('queryMs').toFixed(3)),
      candidateCount: samples[0].candidateCount,
      exactHitCount: samples[0].exactHitCount,
      checksum: samples[0].checksum,
    };
  };

  const legacy = runImplementation('legacy');
  const worldIndex = runImplementation('worldIndex');

  const usesDefaultFixture = options.seed === undefined
    && options.entityCount === undefined
    && options.queryCount === undefined
    && options.worldSize === undefined;
  if (usesDefaultFixture && legacy.signature !== LEGACY_SIGNATURE) {
    throw new Error(`Legacy collision behavior drifted: ${legacy.signature} != ${LEGACY_SIGNATURE}`);
  }
  if (usesDefaultFixture && worldIndex.signature !== WORLD_INDEX_SIGNATURE) {
    throw new Error(`WorldIndex behavior drifted: ${worldIndex.signature} != ${WORLD_INDEX_SIGNATURE}`);
  }
  return {
    benchmark: 'collision',
    seed: options.seed || 0x5A0BDA7A,
    iterations,
    entityCount: fixture.rectangles.length,
    queryCount: fixture.queries.length,
    legacy,
    worldIndex,
    candidateReductionPercent: Number(
      ((1 - worldIndex.candidateCount / legacy.candidateCount) * 100).toFixed(2),
    ),
  };
}

if (require.main === module) {
  console.log(JSON.stringify(runCollisionBenchmark(), null, 2));
}

module.exports = {
  createCollisionFixture,
  executeCollisionPass,
  runCollisionBenchmark,
};
