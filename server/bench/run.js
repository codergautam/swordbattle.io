const { runCollisionBenchmark } = require('./collision.bench');
const { runSnapshotBenchmark } = require('./snapshot.bench');
const { runOutbreakSoak } = require('./outbreak-soak.bench');

console.log(JSON.stringify({
  collision: runCollisionBenchmark(),
  snapshot: runSnapshotBenchmark(),
  outbreakSoak: runOutbreakSoak(),
}, null, 2));
