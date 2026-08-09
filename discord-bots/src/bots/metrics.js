import cron from 'node-cron';
import { config } from '../config.js';
import { apiGet, sleep } from '../lib/api.js';
import { loadState, saveState } from '../lib/state.js';
import { colors, discordTimestamp, formatNumber } from '../lib/embeds.js';
import { emojis } from '../lib/emojis.js';
import { createLogger } from '../lib/log.js';
import { createBotClient, sendToChannel } from '../lib/discord.js';

const log = createLogger('metrics');

const todayUtc = () => new Date().toISOString().slice(0, 10);
const yesterdayUtc = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const dayBefore = (dateStr) => new Date(Date.parse(`${dateStr}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

const fmtNum = (n) => (n == null ? 'n/a' : formatNumber(n));
const fmtPct = (n) => (n == null ? 'n/a' : `${n}%`);
const fmtMin = (n) => (n == null ? 'n/a' : `${n} min`);

function fmtDelta(cur, prev) {
  if (cur == null || prev == null) return '';
  const prevNum = Number(prev);
  if (!Number.isFinite(prevNum) || prevNum === 0) return '';
  const change = Math.round(((Number(cur) - prevNum) / Math.abs(prevNum)) * 1000) / 10;
  if (!Number.isFinite(change) || change === 0) return '';
  return change > 0 ? ` (${emojis.deltaUp} ${change}%)` : ` (${emojis.deltaDown} ${Math.abs(change)}%)`;
}

const dashboardLink = () => `${config.adminLinkBase}/#/${config.moderationSecret}/metrics`;

function ccuValue(rec, date) {
  if (!rec || rec.peak < 0) return 'n/a (sampler offline)';
  let value = `${formatNumber(rec.peak)} at ${discordTimestamp(rec.atMs, 't')}`;
  const midnight = Date.parse(`${date}T00:00:00Z`);
  if (rec.firstSampleMs - midnight > 10 * 60000) {
    const d = new Date(rec.firstSampleMs);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    value += ` (since ${hh}:${mm} UTC)`;
  }
  return value;
}

function buildDigestEmbed(digest, prior, ccuRec) {
  const p = prior || {};
  const fields = [
    { name: 'DAU (account/browser)', value: fmtNum(digest.dau) + fmtDelta(digest.dau, p.dau), inline: true },
    { name: 'Client sessions', value: fmtNum(digest.visits) + fmtDelta(digest.visits, p.visits), inline: true },
    { name: 'First observed', value: fmtNum(digest.newPlayers) + fmtDelta(digest.newPlayers, p.newPlayers), inline: true },
    { name: 'Previously observed', value: fmtNum(digest.returningPlayers) + fmtDelta(digest.returningPlayers, p.returningPlayers), inline: true },
    { name: 'Runs started', value: fmtNum(digest.gamesPlayed) + fmtDelta(digest.gamesPlayed, p.gamesPlayed), inline: true },
    { name: 'Conversion (visit→play)', value: fmtPct(digest.conversionPct) + fmtDelta(digest.conversionPct, p.conversionPct), inline: true },
    { name: 'Avg playtime', value: fmtMin(digest.avgPlaytimeMin) + fmtDelta(digest.avgPlaytimeMin, p.avgPlaytimeMin), inline: true },
    { name: 'Median playtime', value: fmtMin(digest.medianPlaytimeMin), inline: true },
    { name: 'First-observed avg', value: fmtMin(digest.newPlayerAvgPlaytimeMin), inline: true },
    { name: 'D1 retention', value: digest.d1Pct == null ? 'n/a' : `${digest.d1Pct}% (of ${formatNumber(digest.d1Cohort)})`, inline: true },
    { name: 'D7 retention', value: digest.d7Pct == null ? 'n/a' : `${digest.d7Pct}% (of ${formatNumber(digest.d7Cohort)})`, inline: true },
    { name: 'Peak CCU', value: ccuValue(ccuRec, digest.date), inline: true },
    { name: 'Tracked ad value (modeled)', value: `$${(digest.adRevenueUsd ?? 0).toFixed(2)}` + fmtDelta(digest.adRevenueUsd, p.adRevenueUsd), inline: true },
    { name: 'Tracked viewable banners', value: fmtNum(digest.adImpressions) + fmtDelta(digest.adImpressions, p.adImpressions), inline: true },
    { name: 'Measured adblock', value: `${fmtPct(digest.adblockPct)} (of ${fmtNum(digest.adblockMeasuredSessions)} sessions)`, inline: true },
  ];
  let footer = 'UTC day · deltas vs prior day · modeled ad value is not provider revenue';
  if (ccuRec && ccuRec.sawPartial) footer += ' · CCU partial';
  return {
    title: `Swordbattle daily metrics — ${digest.date}`,
    color: colors.digest,
    description: `Full dashboard: <${dashboardLink()}>`,
    fields,
    footer: { text: footer },
    timestamp: `${digest.date}T23:59:59.000Z`,
  };
}

function pastFireTimeUtc() {
  const parts = config.metrics.cron.trim().split(/\s+/);
  if (parts.length < 5) return true;
  const m = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(h)) return true;
  const now = new Date();
  return now.getUTCHours() > h || (now.getUTCHours() === h && now.getUTCMinutes() >= m);
}

export async function start(token) {
  const client = await createBotClient(token, log);
  const botState = (await loadState('metrics')) || { lastDigestDate: null, ccu: {} };
  if (!botState.ccu) botState.ccu = {};
  let posting = false;

  const sampleCcu = async () => {
    const now = Date.now();
    const results = await Promise.all(config.metrics.serverInfoUrls.map(async (url) => {
      try {
        const info = await apiGet(url, { timeoutMs: 5000, retries: 0 });
        const count = Number(info.realPlayersCnt);
        return { url, count: Number.isFinite(count) && count >= 0 ? count : null };
      } catch {
        return { url, count: null };
      }
    }));
    const okResults = results.filter((r) => r.count !== null);
    if (!okResults.length) return;
    const dayKey = todayUtc();
    const rec = botState.ccu[dayKey] || { peak: -1, atMs: null, firstSampleMs: now, samples: 0, sawPartial: false, regionsSeen: [] };
    if (!Array.isArray(rec.regionsSeen)) rec.regionsSeen = [];
    for (const r of okResults) {
      if (!rec.regionsSeen.includes(r.url)) rec.regionsSeen.push(r.url);
    }
    const complete = okResults.length === results.length;
    if (!complete) rec.sawPartial = true;
    if (!complete) {
      botState.ccu[dayKey] = rec;
      await saveState('metrics', botState);
      return;
    }
    const sum = okResults.reduce((acc, r) => acc + r.count, 0);
    if (sum > rec.peak) {
      rec.peak = sum;
      rec.atMs = now;
    }
    rec.samples += 1;
    botState.ccu[dayKey] = rec;
    const cutoff = Date.now() - 14 * 86400000;
    for (const key of Object.keys(botState.ccu)) {
      if (Date.parse(`${key}T00:00:00Z`) < cutoff) delete botState.ccu[key];
    }
    await saveState('metrics', botState);
  };

  const fetchDigestWithRetry = async (date) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        return await apiGet(`/analytics/daily-digest?date=${date}`, { auth: true, timeoutMs: 30000 });
      } catch (err) {
        log.warn(`digest fetch attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < 5) await sleep(5 * 60000);
      }
    }
    return null;
  };

  const postDigest = async () => {
    if (posting) return;
    posting = true;
    try {
      const target = yesterdayUtc();
      if (botState.lastDigestDate === target) return;
      const digest = await fetchDigestWithRetry(target);
      if (!digest) {
        await sendToChannel(client, config.metrics.channelId, {
          content: `<@&${config.metrics.roleId}> Daily metrics for ${target} are unavailable (API unreachable after retries). Dashboard: <${dashboardLink()}>`,
          allowedMentions: { parse: [], roles: [config.metrics.roleId] },
        }, log);
        botState.lastDigestDate = target;
        await saveState('metrics', botState);
        return;
      }
      const prior = await apiGet(`/analytics/daily-digest?date=${dayBefore(target)}`, { auth: true, timeoutMs: 30000 }).catch(() => null);
      const embed = buildDigestEmbed(digest, prior, botState.ccu[target]);
      await sendToChannel(client, config.metrics.channelId, {
        content: `<@&${config.metrics.roleId}> Daily metrics for ${target}`,
        embeds: [embed],
        allowedMentions: { parse: [], roles: [config.metrics.roleId] },
      }, log);
      botState.lastDigestDate = target;
      await saveState('metrics', botState);
    } catch (err) {
      log.error(`postDigest failed: ${err.message}`);
    } finally {
      posting = false;
    }
  };

  await sampleCcu();
  const ccuTimer = setInterval(sampleCcu, config.metrics.ccuPollMs);
  const task = cron.schedule(config.metrics.cron, postDigest, { timezone: config.metrics.tz });
  if (botState.lastDigestDate && botState.lastDigestDate !== yesterdayUtc() && pastFireTimeUtc()) {
    postDigest().catch((err) => log.error(`catch-up digest failed: ${err.message}`));
  }

  return {
    name: 'metrics',
    client,
    stop: async () => {
      clearInterval(ccuTimer);
      task.stop();
      await client.destroy();
    },
  };
}
