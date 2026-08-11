const test = require('node:test');
const assert = require('node:assert/strict');
const PerformanceMetrics = require('../src/metrics/PerformanceMetrics');

test('performance metrics aggregate tick phases, packet sizes, loop delay, and memory', () => {
  let now = 0;
  const monitor = {
    min: 1e6,
    max: 9e6,
    mean: 3e6,
    enabled: false,
    resetCount: 0,
    enable() { this.enabled = true; },
    disable() { this.enabled = false; },
    reset() { this.resetCount += 1; },
    percentile(value) { return value === 50 ? 2e6 : (value === 95 ? 7e6 : 8e6); },
  };
  const metrics = new PerformanceMetrics({
    now: () => now,
    eventLoopMonitor: monitor,
    systemSampleIntervalMs: 1000,
    memoryUsage: () => ({
      rss: 1000,
      heapTotal: 800,
      heapUsed: 500,
      external: 100,
      arrayBuffers: 50,
    }),
  });

  metrics.recordPhase('simulation', 4);
  metrics.recordPhase('simulation', 6);
  metrics.recordTick(12);
  metrics.recordPacket(120, { kind: 'delta' });
  metrics.recordPacket(480, { kind: 'fullSync', dropped: true });
  now = 1500;

  const snapshot = metrics.snapshot();
  assert.deepEqual(snapshot.tick.phases.simulation, {
    count: 2,
    lastMs: 6,
    meanMs: 5,
    maxMs: 6,
  });
  assert.equal(snapshot.tick.meanMs, 12);
  assert.equal(snapshot.packets.meanBytes, 300);
  assert.equal(snapshot.packets.droppedPackets, 1);
  assert.equal(snapshot.packets.byKind.fullSync.maxBytes, 480);
  assert.equal(snapshot.eventLoopDelay.p95Ms, 7);
  assert.equal(snapshot.memory.heapUsedBytes, 500);

  metrics.close();
  assert.equal(monitor.enabled, false);
});
