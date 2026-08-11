const { performance } = require('node:perf_hooks');
const QuadTree = require('../src/game/components/Quadtree');
const { rectangleRectangle } = require('../src/game/collisions');

const DEFAULT_SIGNATURE = '28329:6120:3015404203';

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

function executeCollisionPass(fixture) {
  const tree = new QuadTree({
    x: 0,
    y: 0,
    width: fixture.worldSize,
    height: fixture.worldSize,
  }, 10, 5);

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
  const samples = [];
  let expected = null;

  for (let iteration = 0; iteration < iterations; iteration++) {
    const sample = executeCollisionPass(fixture);
    const deterministicSignature = `${sample.candidateCount}:${sample.exactHitCount}:${sample.checksum}`;
    if (expected === null) expected = deterministicSignature;
    if (deterministicSignature !== expected) {
      throw new Error(`Collision benchmark became nondeterministic: ${deterministicSignature} != ${expected}`);
    }
    samples.push(sample);
  }

  const average = (key) => samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;
  const usesDefaultFixture = options.seed === undefined
    && options.entityCount === undefined
    && options.queryCount === undefined
    && options.worldSize === undefined;
  if (usesDefaultFixture && expected !== DEFAULT_SIGNATURE) {
    throw new Error(`Collision behavior drifted: ${expected} != ${DEFAULT_SIGNATURE}`);
  }
  return {
    benchmark: 'collision',
    seed: options.seed || 0x5A0BDA7A,
    iterations,
    entityCount: fixture.rectangles.length,
    queryCount: fixture.queries.length,
    buildMeanMs: Number(average('buildMs').toFixed(3)),
    queryMeanMs: Number(average('queryMs').toFixed(3)),
    candidateCount: samples[0].candidateCount,
    exactHitCount: samples[0].exactHitCount,
    checksum: samples[0].checksum,
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
