import { apiGet } from './api.js';
import { createLogger } from './log.js';

const log = createLogger('botConfig');

const defaults = {
  support: { notifyStaffReply: false, notifyClosed: false, notifyStatusChange: false },
  leaderboard: { topN: 10, singlePush: false, dailyEnabled: false, dailyXpThreshold: 500000 },
};

let cached = defaults;
let timer = null;

export const getBotConfig = () => cached;

export async function refreshBotConfig() {
  try {
    const next = await apiGet('/bots/config', { auth: true, timeoutMs: 8000 });
    if (next && next.support && next.leaderboard) cached = next;
  } catch (err) {
    log.warn(`config fetch failed, keeping previous: ${err.message}`);
  }
  return cached;
}

export function startBotConfigRefresh(intervalMs = 60000) {
  if (timer) return;
  timer = setInterval(refreshBotConfig, intervalMs);
}

export function stopBotConfigRefresh() {
  if (timer) clearInterval(timer);
  timer = null;
}
