const { runCollisionBenchmark } = require('./collision.bench');
const { runSnapshotBenchmark } = require('./snapshot.bench');

console.log(JSON.stringify({
  collision: runCollisionBenchmark(),
  snapshot: runSnapshotBenchmark(),
}, null, 2));
