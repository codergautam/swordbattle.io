const { performance } = require('perf_hooks');
const PlayerBot = require('../src/game/entities/PlayerBot');
const Game = require('../src/game/Game');

let seed = 123456789;
Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

const oldLog = console.log;
const oldWarn = console.warn;
console.log = () => {};
console.warn = () => {};

let calls = 0;
let botMs = 0;
let perceptions = 0;
let projectileScans = 0;
const applyInputs = PlayerBot.prototype.applyInputs;
const perceive = PlayerBot.prototype.perceive;
const scan = PlayerBot.prototype.scanProjectileThreats;

PlayerBot.prototype.applyInputs = function measuredApplyInputs(dt) {
  const start = performance.now();
  const result = applyInputs.call(this, dt);
  botMs += performance.now() - start;
  calls++;
  return result;
};
PlayerBot.prototype.perceive = function measuredPerceive() {
  perceptions++;
  return perceive.call(this);
};
PlayerBot.prototype.scanProjectileThreats = function measuredProjectileScan() {
  projectileScans++;
  return scan.call(this);
};

const game = new Game();
game.initialize();
// Keep combat/resource cascades from changing entity density between runs.
game.map.spawnCoinsInShape = () => {};
for (let i = 0; i < 30; i++) game.tick(1 / 30);

calls = 0;
botMs = 0;
perceptions = 0;
projectileScans = 0;
const ticks = 180;
const start = performance.now();
for (let i = 0; i < ticks; i++) game.tick(1 / 30);
const totalMs = performance.now() - start;

console.log = oldLog;
console.warn = oldWarn;
oldLog(JSON.stringify({
  bots: [...game.players].filter(player => player.isBot).length,
  entities: game.entities.size,
  ticks,
  totalMs: Number(totalMs.toFixed(2)),
  msPerTick: Number((totalMs / ticks).toFixed(3)),
  botAiMsPerTick: Number((botMs / ticks).toFixed(3)),
  botApplyCallsPerTick: Number((calls / ticks).toFixed(2)),
  generalPerceptionsPerTick: Number((perceptions / ticks).toFixed(2)),
  projectileScansPerTick: Number((projectileScans / ticks).toFixed(2)),
}));
