const envNumber = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  apiBase: process.env.API_BASE || 'https://api.swordbattle.io',
  moderationSecret: process.env.MODERATION_SECRET || '',
  adminLinkBase: process.env.ADMIN_LINK_BASE || 'https://swordbattle.io',
  stateDir: process.env.STATE_DIR || './state',
  dryRun: process.env.DRY_RUN === '1',
  support: {
    token: process.env.SUPPORT_BOT_TOKEN,
    channelId: process.env.SUPPORT_CHANNEL_ID || '1534649622184722452',
    roleId: process.env.SUPPORT_ROLE_ID || '1534654609014915152',
    pollMs: envNumber('SUPPORT_POLL_MS', 25000),
  },
  metrics: {
    token: process.env.METRICS_BOT_TOKEN,
    channelId: process.env.METRICS_CHANNEL_ID || '1534649622184722452',
    roleId: process.env.METRICS_ROLE_ID || '1534654923457822923',
    cron: process.env.METRICS_CRON || '15 0 * * *',
    tz: process.env.METRICS_TZ || 'UTC',
    ccuPollMs: envNumber('CCU_POLL_MS', 60000),
    serverInfoUrls: (process.env.SERVERINFO_URLS || 'https://na.swordbattle.io/serverinfo,https://eu.swordbattle.io/serverinfo')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  leaderboard: {
    token: process.env.LEADERBOARD_BOT_TOKEN,
    channelId: process.env.LEADERBOARD_CHANNEL_ID || '1534655316749324368',
    roleId: process.env.LEADERBOARD_ROLE_ID || '1527448444086652938',
    pollSeconds: envNumber('LEADERBOARD_POLL_SECONDS', 60),
    staggerMs: envNumber('LEADERBOARD_STAGGER_MS', 4000),
    flushMinutes: envNumber('LEADERBOARD_FLUSH_MINUTES', 5),
    dailyCron: process.env.LEADERBOARD_DAILY_CRON || '55 23 * * *',
    dailyTz: process.env.LEADERBOARD_DAILY_TZ || 'UTC',
    messagePollMs: envNumber('LEADERBOARD_MESSAGE_POLL_MS', 15000),
  },
};
