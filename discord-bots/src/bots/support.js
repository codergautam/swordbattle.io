import { config } from '../config.js';
import { apiGet } from '../lib/api.js';
import { loadState, saveState } from '../lib/state.js';
import { colors, discordTimestamp, truncate } from '../lib/embeds.js';
import { createLogger } from '../lib/log.js';
import { createBotClient, sendToChannel } from '../lib/discord.js';

const log = createLogger('support');

const categoryTitles = {
  password: 'Reset a password',
  lag: 'Report lag',
  bug: 'Report a bug',
  other: 'Something else',
};

const subjectOf = (t) => t.subject || categoryTitles[t.category] || 'Support';
const ticketLink = (id) => `${config.adminLinkBase}/#/${config.moderationSecret}/support?ticket=${id}`;

function accountLabel(t) {
  if (t.username) return `@${t.username}${t.account_id ? ` (id ${t.account_id})` : ''}`;
  if (t.client_id) return `anonymous (client ${String(t.client_id).slice(0, 12)}…)`;
  return 'anonymous';
}

function buildEmbed(t, msg, kind) {
  const lines = [];
  lines.push(msg && msg.text ? truncate(msg.text, 300) : '(no text)');
  if (msg && msg.imageCount > 0) lines.push(`Attachments: ${msg.imageCount} image(s)`);
  lines.push(`Respond here: <${ticketLink(t.id)}>`);
  const fields = [
    { name: 'Category', value: categoryTitles[t.category] || t.category, inline: true },
    { name: 'Status', value: t.status, inline: true },
    { name: 'Account', value: accountLabel(t), inline: true },
    { name: 'Created', value: discordTimestamp(t.created_at), inline: true },
  ];
  if (kind === 'reply' && msg) fields.push({ name: 'Replied', value: discordTimestamp(msg.at), inline: true });
  return {
    title: truncate(`Ticket #${t.id} — ${subjectOf(t)}`, 256),
    url: ticketLink(t.id),
    color: kind === 'new' ? colors.newTicket : colors.reply,
    description: lines.join('\n'),
    fields,
    timestamp: new Date(t.updated_at).toISOString(),
  };
}

export async function start(token) {
  const client = await createBotClient(token, log);
  const botState = (await loadState('support')) || { watermark: null, notified: {} };
  if (!botState.notified) botState.notified = {};
  let inFlight = false;

  const send = (content, embed) =>
    sendToChannel(client, config.support.channelId, {
      content,
      embeds: [embed],
      allowedMentions: { parse: [], roles: [config.support.roleId] },
    }, log);

  const pruneNotified = () => {
    const cutoff = Date.now() - 30 * 86400000;
    for (const [id, at] of Object.entries(botState.notified)) {
      if (at < cutoff) delete botState.notified[id];
    }
  };

  const processTicket = async (t, watermark) => {
    const createdAtMs = Date.parse(t.created_at);
    const lastNotified = botState.notified[t.id] || 0;
    const freshUserMsgs = (t.messages || []).filter(
      (m) => m.from === 'user' && m.at > watermark && m.at > createdAtMs + 2000 && m.at > lastNotified,
    );
    if (createdAtMs > watermark && lastNotified < createdAtMs) {
      const first = (t.messages || [])[0];
      await send(`<@&${config.support.roleId}> A new support ticket has been created!`, buildEmbed(t, first, 'new'));
      botState.notified[t.id] = Math.max(createdAtMs, ...freshUserMsgs.map((m) => m.at));
      await saveState('support', botState);
      return;
    }
    if (freshUserMsgs.length) {
      const latest = freshUserMsgs[freshUserMsgs.length - 1];
      const who = t.username ? `@${t.username}` : 'An anonymous user';
      await send(
        `<@&${config.support.roleId}> ${who} has responded on their support ticket "${subjectOf(t)}"`,
        buildEmbed(t, latest, 'reply'),
      );
      botState.notified[t.id] = latest.at;
      await saveState('support', botState);
    }
  };

  const poll = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      if (botState.watermark === null) {
        const res = await apiGet(`/support/admin/updates?since=${Date.now()}`, { auth: true });
        botState.watermark = res.serverTime;
        await saveState('support', botState);
        log.info(`baselined watermark at ${new Date(botState.watermark).toISOString()}`);
        return;
      }
      let guard = 0;
      while (guard < 10) {
        guard += 1;
        const res = await apiGet(`/support/admin/updates?since=${botState.watermark}`, { auth: true });
        const tickets = Array.isArray(res.tickets) ? res.tickets : [];
        if (!tickets.length) break;
        const startWatermark = botState.watermark;
        for (const t of tickets) {
          try {
            await processTicket(t, startWatermark);
          } catch (err) {
            log.error(`notify failed for ticket ${t.id}: ${err.message}`);
            await saveState('support', botState);
            return;
          }
        }
        const maxUpdated = Math.max(...tickets.map((t) => Date.parse(t.updated_at)));
        botState.watermark = tickets.length === 100 ? maxUpdated - 1 : maxUpdated;
        pruneNotified();
        await saveState('support', botState);
        if (tickets.length < 100) break;
      }
    } catch (err) {
      log.warn(`poll failed: ${err.message}`);
    } finally {
      inFlight = false;
    }
  };

  await poll();
  const timer = setInterval(poll, config.support.pollMs);

  return {
    name: 'support',
    client,
    stop: async () => {
      clearInterval(timer);
      await client.destroy();
    },
  };
}
