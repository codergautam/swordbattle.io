import { config } from '../config.js';
import { apiGet } from '../lib/api.js';
import { loadState, saveState } from '../lib/state.js';
import { colors, discordTimestamp, truncate } from '../lib/embeds.js';
import { getBotConfig, refreshBotConfig, startBotConfigRefresh, stopBotConfigRefresh } from '../lib/botConfig.js';
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
  if (kind === 'staff' && msg) fields.push({ name: 'Sent', value: discordTimestamp(msg.at), inline: true });
  const color = kind === 'new' ? colors.newTicket : kind === 'reply' ? colors.reply : colors.staffReply;
  return {
    title: truncate(`Ticket #${t.id} — ${subjectOf(t)}`, 256),
    url: ticketLink(t.id),
    color,
    description: lines.join('\n'),
    fields,
    timestamp: new Date(t.updated_at).toISOString(),
  };
}

function buildStatusEmbed(t, prevStatus) {
  return {
    title: truncate(`Ticket #${t.id} — ${subjectOf(t)}`, 256),
    url: ticketLink(t.id),
    color: colors.statusChange,
    description: `Status changed from **${prevStatus}** to **${t.status}**.\nOpen here: <${ticketLink(t.id)}>`,
    fields: [
      { name: 'Category', value: categoryTitles[t.category] || t.category, inline: true },
      { name: 'Account', value: accountLabel(t), inline: true },
    ],
    timestamp: new Date(t.updated_at).toISOString(),
  };
}

export async function start(token) {
  const client = await createBotClient(token, log);
  const botState = (await loadState('support')) || {};
  if (typeof botState.watermark === 'undefined') botState.watermark = null;
  if (!botState.tickets) {
    botState.tickets = {};
    if (botState.notified) {
      for (const [id, at] of Object.entries(botState.notified)) {
        botState.tickets[id] = { notified: at, staffNotified: 0, status: null, seenAt: at };
      }
    }
  }
  delete botState.notified;
  let inFlight = false;

  await refreshBotConfig();
  startBotConfigRefresh();

  const send = (content, embed, roleId) =>
    sendToChannel(client, config.support.channelId, {
      content,
      embeds: [embed],
      allowedMentions: { parse: [], roles: roleId ? [roleId] : [] },
    }, log);

  const entry = (id) => {
    if (!botState.tickets[id]) botState.tickets[id] = { notified: 0, staffNotified: 0, status: null, seenAt: Date.now() };
    return botState.tickets[id];
  };

  const prune = () => {
    const cutoff = Date.now() - 30 * 86400000;
    for (const [id, rec] of Object.entries(botState.tickets)) {
      if ((rec.seenAt || 0) < cutoff) delete botState.tickets[id];
    }
  };

  const processTicket = async (t, watermark) => {
    const cfg = getBotConfig().support;
    const rec = entry(t.id);
    const createdAtMs = Date.parse(t.created_at);
    const prevStatus = rec.status;
    rec.seenAt = Date.now();

    const freshUserMsgs = (t.messages || []).filter(
      (m) => m.from === 'user' && m.at > watermark && m.at > createdAtMs + 2000 && m.at > (rec.notified || 0),
    );
    const freshStaffMsgs = (t.messages || []).filter(
      (m) => m.from === 'staff' && m.at > watermark && m.at > (rec.staffNotified || 0),
    );

    let handled = false;

    if (createdAtMs > watermark && (rec.notified || 0) < createdAtMs) {
      const first = (t.messages || [])[0];
      await send(`<@&${config.support.roleId}> A new support ticket has been created!`, buildEmbed(t, first, 'new'), config.support.roleId);
      rec.notified = Math.max(createdAtMs, ...freshUserMsgs.map((m) => m.at));
      handled = true;
    } else if (freshUserMsgs.length) {
      const latest = freshUserMsgs[freshUserMsgs.length - 1];
      const who = t.username ? `@${t.username}` : 'An anonymous user';
      await send(
        `<@&${config.support.roleId}> ${who} has responded on their support ticket "${subjectOf(t)}"`,
        buildEmbed(t, latest, 'reply'),
        config.support.roleId,
      );
      rec.notified = latest.at;
      handled = true;
    }

    if (freshStaffMsgs.length) {
      const latest = freshStaffMsgs[freshStaffMsgs.length - 1];
      if (!handled && cfg.notifyStaffReply) {
        await send(`Staff replied to support ticket "${subjectOf(t)}"`, buildEmbed(t, latest, 'staff'), null);
        handled = true;
      }
      rec.staffNotified = latest.at;
    }

    if (!handled && prevStatus && prevStatus !== t.status) {
      const isClosed = t.status === 'closed';
      if ((isClosed && cfg.notifyClosed) || (!isClosed && cfg.notifyStatusChange)) {
        const content = isClosed
          ? `Support ticket "${subjectOf(t)}" was closed`
          : `Support ticket "${subjectOf(t)}" is now ${t.status}`;
        await send(content, buildStatusEmbed(t, prevStatus), null);
      }
    }

    rec.status = t.status;
  };

  const poll = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      if (botState.watermark === null) {
        const res = await apiGet(`/support/admin/updates?since=${Date.now()}`, { auth: true });
        botState.watermark = res.serverTime;
        for (const t of res.tickets || []) entry(t.id).status = t.status;
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
        prune();
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
      stopBotConfigRefresh();
      await client.destroy();
    },
  };
}
