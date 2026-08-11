const { monitorEventLoopDelay, performance } = require('node:perf_hooks');

const NANOSECONDS_PER_MILLISECOND = 1e6;

function createAggregate() {
  return {
    count: 0,
    total: 0,
    last: 0,
    max: 0,
  };
}

function addSample(aggregate, value) {
  if (!Number.isFinite(value) || value < 0) return;
  aggregate.count += 1;
  aggregate.total += value;
  aggregate.last = value;
  if (value > aggregate.max) aggregate.max = value;
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarizeTiming(aggregate) {
  return {
    count: aggregate.count,
    lastMs: round(aggregate.last),
    meanMs: round(aggregate.count === 0 ? 0 : aggregate.total / aggregate.count),
    maxMs: round(aggregate.max),
  };
}

function summarizePacketAggregate(aggregate) {
  return {
    count: aggregate.count,
    lastBytes: aggregate.last,
    meanBytes: Math.round(aggregate.count === 0 ? 0 : aggregate.total / aggregate.count),
    maxBytes: aggregate.max,
    totalBytes: aggregate.total,
  };
}

function nanosecondsToMilliseconds(value) {
  // An empty event-loop histogram reports an extremely large sentinel as min.
  if (!Number.isFinite(value) || value < 0 || value > 1e15) return 0;
  return round(value / NANOSECONDS_PER_MILLISECOND);
}

class PerformanceMetrics {
  constructor(options = {}) {
    this.now = options.now || (() => performance.now());
    this.memoryUsage = options.memoryUsage || (() => process.memoryUsage());
    this.systemSampleIntervalMs = options.systemSampleIntervalMs || 1000;
    this.startedAt = this.now();
    this.lastSystemSampleAt = Number.NEGATIVE_INFINITY;

    this.tick = createAggregate();
    this.phases = new Map();
    this.packets = createAggregate();
    this.packetKinds = new Map();
    this.droppedPackets = 0;

    this.eventLoop = {
      minMs: 0,
      maxMs: 0,
      meanMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
    };
    this.memory = {
      rssBytes: 0,
      heapTotalBytes: 0,
      heapUsedBytes: 0,
      externalBytes: 0,
      arrayBuffersBytes: 0,
    };

    this.eventLoopMonitor = options.eventLoopMonitor
      || monitorEventLoopDelay({ resolution: options.eventLoopResolutionMs || 20 });
    if (this.eventLoopMonitor && typeof this.eventLoopMonitor.enable === 'function') {
      this.eventLoopMonitor.enable();
    }
    this.sampleSystem(true);
  }

  recordPhase(name, durationMs) {
    let aggregate = this.phases.get(name);
    if (!aggregate) {
      aggregate = createAggregate();
      this.phases.set(name, aggregate);
    }
    addSample(aggregate, durationMs);
  }

  recordTick(durationMs) {
    addSample(this.tick, durationMs);
    this.sampleSystem(false);
  }

  recordPacket(byteLength, options = {}) {
    if (!Number.isFinite(byteLength) || byteLength < 0) return;
    addSample(this.packets, byteLength);

    const kind = options.kind || 'other';
    let aggregate = this.packetKinds.get(kind);
    if (!aggregate) {
      aggregate = createAggregate();
      this.packetKinds.set(kind, aggregate);
    }
    addSample(aggregate, byteLength);
    if (options.dropped) this.droppedPackets += 1;
  }

  sampleSystem(force = false) {
    const sampledAt = this.now();
    if (!force && sampledAt - this.lastSystemSampleAt < this.systemSampleIntervalMs) return;
    this.lastSystemSampleAt = sampledAt;

    const memory = this.memoryUsage();
    this.memory = {
      rssBytes: memory.rss || 0,
      heapTotalBytes: memory.heapTotal || 0,
      heapUsedBytes: memory.heapUsed || 0,
      externalBytes: memory.external || 0,
      arrayBuffersBytes: memory.arrayBuffers || 0,
    };

    const histogram = this.eventLoopMonitor;
    if (!histogram) return;
    const percentile = (value) => (
      typeof histogram.percentile === 'function' ? histogram.percentile(value) : 0
    );
    this.eventLoop = {
      minMs: nanosecondsToMilliseconds(histogram.min),
      maxMs: nanosecondsToMilliseconds(histogram.max),
      meanMs: nanosecondsToMilliseconds(histogram.mean),
      p50Ms: nanosecondsToMilliseconds(percentile(50)),
      p95Ms: nanosecondsToMilliseconds(percentile(95)),
      p99Ms: nanosecondsToMilliseconds(percentile(99)),
    };
    if (typeof histogram.reset === 'function') histogram.reset();
  }

  snapshot() {
    this.sampleSystem(false);
    const phases = {};
    for (const [name, aggregate] of this.phases) {
      phases[name] = summarizeTiming(aggregate);
    }

    const byKind = {};
    for (const [name, aggregate] of this.packetKinds) {
      byKind[name] = summarizePacketAggregate(aggregate);
    }

    return {
      uptimeSeconds: round((this.now() - this.startedAt) / 1000),
      tick: {
        ...summarizeTiming(this.tick),
        phases,
      },
      packets: {
        ...summarizePacketAggregate(this.packets),
        droppedPackets: this.droppedPackets,
        byKind,
      },
      eventLoopDelay: { ...this.eventLoop },
      memory: { ...this.memory },
    };
  }

  close() {
    if (this.eventLoopMonitor && typeof this.eventLoopMonitor.disable === 'function') {
      this.eventLoopMonitor.disable();
    }
  }
}

module.exports = PerformanceMetrics;
