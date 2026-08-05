import { createLogger } from './lib/log.js';

const log = createLogger('main');

const registry = [
  { name: 'support', tokenEnv: 'SUPPORT_BOT_TOKEN', path: './bots/support.js' },
  { name: 'metrics', tokenEnv: 'METRICS_BOT_TOKEN', path: './bots/metrics.js' },
  { name: 'leaderboard', tokenEnv: 'LEADERBOARD_BOT_TOKEN', path: './bots/leaderboard/index.js' },
];

const started = [];

for (const entry of registry) {
  const token = process.env[entry.tokenEnv];
  if (!token) {
    log.warn(`${entry.name}: ${entry.tokenEnv} not set, skipping`);
    continue;
  }
  try {
    const mod = await import(entry.path);
    started.push(await mod.start(token));
    log.info(`${entry.name}: started`);
  } catch (err) {
    log.error(`${entry.name}: failed to start`, err);
  }
}

if (!started.length) {
  log.error('no bots started, exiting');
  process.exit(1);
}

process.on('unhandledRejection', (err) => log.error('unhandledRejection', err));
process.on('uncaughtException', (err) => log.error('uncaughtException', err));

const shutdown = async () => {
  log.info('shutting down');
  await Promise.allSettled(started.map((b) => b.stop()));
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
