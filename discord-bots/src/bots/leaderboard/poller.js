import { boards, fetchBoard } from './boards.js';
import { config } from '../../config.js';
import { sleep } from '../../lib/api.js';
import { createLogger } from '../../lib/log.js';

const log = createLogger('leaderboard:poller');

export function createPoller() {
  const snapshots = new Map();
  let timer = null;
  let stopped = false;
  let announcer = null;

  const runCycle = async () => {
    const cycleStart = Date.now();
    const fetchedKeys = [];
    for (let i = 0; i < boards.length; i += 1) {
      if (stopped) return;
      if (i > 0) await sleep(config.leaderboard.staggerMs);
      const board = boards[i];
      try {
        const rows = await fetchBoard(board, 'all');
        snapshots.set(board.key, { fetchedAt: Date.now(), rows });
        fetchedKeys.push(board.key);
      } catch (err) {
        log.warn(`fetch failed for ${board.key}: ${err.message}`);
      }
    }
    if (fetchedKeys.length && announcer) {
      try {
        await announcer.evaluate(fetchedKeys);
      } catch (err) {
        log.error(`evaluate failed: ${err.message}`);
      }
    }
    if (stopped) return;
    const elapsed = Date.now() - cycleStart;
    timer = setTimeout(runCycle, Math.max(5000, config.leaderboard.pollSeconds * 1000 - elapsed));
  };

  return {
    start(announcerInstance) {
      announcer = announcerInstance;
      timer = setTimeout(runCycle, 3000);
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    getBoard: (key) => snapshots.get(key),
    getFreshBoard(key) {
      const snap = snapshots.get(key);
      if (!snap) return undefined;
      if (Date.now() - snap.fetchedAt > 3 * config.leaderboard.pollSeconds * 1000) return undefined;
      return snap;
    },
  };
}
