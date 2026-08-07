import { apiGet, apiPost } from '../../lib/api.js';
import { colors, parseColor, reactionIdentifier } from '../../lib/embeds.js';
import { config } from '../../config.js';

export function createMessagePoller({ sendRaw, log }) {
  let timer = null;
  let inFlight = false;

  const deliver = async (row) => {
    const embed = {
      color: parseColor(row.color, colors.brand),
      description: row.body || undefined,
    };
    if (row.title) embed.title = row.title;
    if (!embed.description && !embed.title) embed.description = '​';
    const payload = {
      content: row.ping ? `<@&${config.leaderboard.roleId}>` : '',
      embeds: [embed],
      allowedMentions: { parse: [], roles: row.ping ? [config.leaderboard.roleId] : [] },
    };
    const sent = await sendRaw(payload);
    const failedReactions = [];
    for (const raw of row.reactions || []) {
      if (!sent) break;
      try {
        await sent.react(reactionIdentifier(raw));
      } catch (err) {
        failedReactions.push(raw);
      }
    }
    return failedReactions.length ? `could not add reactions: ${failedReactions.join(' ')}` : null;
  };

  const poll = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const rows = await apiGet('/bots/messages/pending?bot=leaderboard', { auth: true });
      for (const row of Array.isArray(rows) ? rows : []) {
        try {
          const warning = await deliver(row);
          await apiPost('/bots/messages/status', { id: row.id, status: 'sent', error: warning }, { auth: true });
          log.info(`custom message ${row.id} sent${warning ? ` (${warning})` : ''}`);
        } catch (err) {
          await apiPost('/bots/messages/status', { id: row.id, status: 'failed', error: err.message }, { auth: true }).catch(() => {});
          log.error(`custom message ${row.id} failed: ${err.message}`);
        }
      }
    } catch (err) {
      log.warn(`message poll failed: ${err.message}`);
    } finally {
      inFlight = false;
    }
  };

  return {
    start() {
      timer = setInterval(poll, config.leaderboard.messagePollMs);
    },
    stop() {
      if (timer) clearInterval(timer);
    },
    poll,
  };
}
