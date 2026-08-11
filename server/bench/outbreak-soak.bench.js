const { performance } = require('node:perf_hooks');
const WorldIndex = require('../src/game/components/WorldIndex');
const PerformanceMetrics = require('../src/metrics/PerformanceMetrics');

function runOutbreakSoak(options = {}) {
  const playerCount = options.playerCount || 100;
  const zombieCount = options.zombieCount || 2000;
  const tickRate = options.tickRate || 20;
  const simulatedSeconds = options.simulatedSeconds || 300;
  const tickCount = tickRate * simulatedSeconds;
  const worldSize = 35000;
  const entities = new Map();
  const positions = [];
  let seed = 0x51A7C0DE;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const addEntity = (id, radius, speed) => {
    const state = {
      x: -worldSize / 2 + radius + random() * (worldSize - radius * 2),
      y: -worldSize / 2 + radius + random() * (worldSize - radius * 2),
      vx: (random() * 2 - 1) * speed,
      vy: (random() * 2 - 1) * speed,
      radius,
    };
    positions.push(state);
    entities.set(id, {
      id, isStatic: false, removed: false,
      shape: { get boundary() { return { x: state.x - radius, y: state.y - radius, width: radius * 2, height: radius * 2 }; } },
    });
  };
  for (let i = 0; i < playerCount; i++) addEntity(i + 1, 72, 310);
  for (let i = 0; i < zombieCount; i++) addEntity(playerCount + i + 1, i % 20 === 19 ? 105 : 66, 250 + (i % 4) * 35);

  const index = new WorldIndex({ x: -worldSize / 2, y: -worldSize / 2, width: worldSize, height: worldSize }, 512);
  const metrics = new PerformanceMetrics({ systemSampleIntervalMs: 250 });
  const dt = 1 / tickRate;
  let checksum = 2166136261;
  const started = performance.now();
  for (let tick = 0; tick < tickCount; tick++) {
    const tickStarted = performance.now();
    const moveStarted = performance.now();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -worldSize / 2 + p.radius || p.x > worldSize / 2 - p.radius) p.vx *= -1;
      if (p.y < -worldSize / 2 + p.radius || p.y > worldSize / 2 - p.radius) p.vy *= -1;
    }
    metrics.recordPhase('entityUpdate', performance.now() - moveStarted);
    const syncStarted = performance.now();
    index.sync(entities);
    metrics.recordPhase('spatialIndexSync', performance.now() - syncStarted);

    if (tick % tickRate === 0) {
      const queryStarted = performance.now();
      for (let i = 0; i < playerCount; i++) {
        const p = positions[i];
        const visible = index.get({ x: p.x - 1100, y: p.y - 700, width: 2200, height: 1400 });
        checksum = Math.imul((checksum ^ visible.length ^ i) >>> 0, 16777619) >>> 0;
        metrics.recordPacket(24 + visible.length * 32, { kind: 'outbreak-soak' });
      }
      metrics.recordPhase('snapshotQueries', performance.now() - queryStarted);
    }
    metrics.recordTick(performance.now() - tickStarted);
  }
  const report = metrics.snapshot();
  metrics.close();
  return {
    benchmark: 'outbreak-soak', playerCount, zombieCount, simulatedSeconds, tickRate,
    wallTimeMs: Number((performance.now() - started).toFixed(3)), checksum, metrics: report,
  };
}

if (require.main === module) console.log(JSON.stringify(runOutbreakSoak(), null, 2));
module.exports = { runOutbreakSoak };
