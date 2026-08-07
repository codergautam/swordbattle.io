import cron from 'node-cron';
import { apiPost } from '../../lib/api.js';
import { loadState, saveState } from '../../lib/state.js';
import { getBotConfig } from '../../lib/botConfig.js';
import { dedupeStatsRows, normalizeStatsRow } from './boards.js';
import { colors, escapeName, formatNumber, medal } from '../../lib/embeds.js';
import { emojis } from '../../lib/emojis.js';
import { config } from '../../config.js';

const todayUtc = () => new Date().toISOString().slice(0, 10);

export function createDailyLeaderboard({ sendMessage, log }) {
  let state = null;
  let task = null;

  const post = async () => {
    const settings = getBotConfig().leaderboard;
    if (!settings.dailyEnabled) return;
    if (!state) state = (await loadState('leaderboardDaily')) || { lastDate: null };
    const date = todayUtc();
    if (state.lastDate === date) return;
    let rows;
    try {
      const raw = await apiPost('/stats/fetch', { sortBy: 'xp', timeRange: 'day', limit: 100 });
      rows = dedupeStatsRows(Array.isArray(raw) ? raw : []).map((r) => normalizeStatsRow(r, 'xp'));
    } catch (err) {
      log.warn(`daily leaderboard fetch failed: ${err.message}`);
      return;
    }
    const top = rows.slice(0, 10);
    if (!top.length) {
      state.lastDate = date;
      await saveState('leaderboardDaily', state);
      return;
    }
    const shouldPing = top[0].value >= settings.dailyXpThreshold;
    const lines = top.map((row, i) => `${medal(i + 1)} ${row.clanTag ? `[${escapeName(row.clanTag)}] ` : ''}**${escapeName(row.username)}** — ${formatNumber(row.value)} XP`);
    const payload = {
      content: shouldPing ? `<@&${config.leaderboard.roleId}> Big day on the leaderboard!` : '',
      embeds: [{
        title: `${emojis.boards.xp} Daily XP leaderboard — ${date}`,
        color: colors.brand,
        description: lines.join('\n'),
        footer: { text: shouldPing ? 'UTC day' : `UTC day · no ping (top earner under ${formatNumber(settings.dailyXpThreshold)} XP)` },
      }],
      allowedMentions: { parse: [], roles: shouldPing ? [config.leaderboard.roleId] : [] },
    };
    try {
      await sendMessage(payload);
      state.lastDate = date;
      await saveState('leaderboardDaily', state);
    } catch (err) {
      log.error(`daily leaderboard send failed: ${err.message}`);
    }
  };

  return {
    start() {
      task = cron.schedule(config.leaderboard.dailyCron, () => { post().catch((err) => log.error(`daily failed: ${err.message}`)); }, { timezone: config.leaderboard.dailyTz });
    },
    stop() {
      if (task) task.stop();
    },
    post,
  };
}
