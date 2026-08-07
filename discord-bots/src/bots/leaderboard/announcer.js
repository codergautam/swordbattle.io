import { boards } from './boards.js';
import { diffTop, isEmptyDiff, hasRealEvents } from './diff.js';
import { emojis } from '../../lib/emojis.js';
import { colors, discordTimestamp, escapeName, formatDuration, formatNumber, truncate } from '../../lib/embeds.js';

const minify = (rows, n) => rows.slice(0, n).map((r) => ({ username: r.username, clanTag: r.clanTag || null, value: r.value, fp: r.fp || null }));

export function createAnnouncer({ getBoard, sendMessage, loadState, saveState, log, cfg, getSettings, now = () => Date.now(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  let state = null;

  const fmtValue = (board, value) => (board.duration ? formatDuration(value) : formatNumber(value));

  const renderBoardValue = (board, d, currentRows, context, settings) => {
    const contextRank = new Map();
    context.forEach((row, i) => contextRank.set(row.username, i + 1));
    const currentRank = new Map();
    currentRows.forEach((row, i) => currentRank.set(row.username, i + 1));
    const display = (username) => {
      const idx = currentRank.get(username);
      const row = idx ? currentRows[idx - 1] : null;
      const tag = row && row.clanTag ? `[${escapeName(row.clanTag)}] ` : '';
      return `${tag}**${escapeName(username)}**`;
    };
    const headlines = [];
    for (const e of [...d.newEntries].sort((a, b) => a.rank - b.rank)) {
      const was = contextRank.get(e.username);
      const wasNote = was && was > settings.topN ? ` (was #${was})` : '';
      if (e.rank === 1) headlines.push(`${emojis.crown} New #1: ${display(e.username)} — ${fmtValue(board, e.value)}${wasNote}`);
      else headlines.push(`${emojis.enter} ${display(e.username)} entered at #${e.rank} — ${fmtValue(board, e.value)}${wasNote}`);
    }
    for (const u of [...d.rankUps].sort((a, b) => a.to - b.to)) {
      if (u.to === 1) headlines.push(`${emojis.crown} ${display(u.username)} took #1 (was #${u.from}) — ${fmtValue(board, u.value)}`);
      else headlines.push(`${emojis.up} ${display(u.username)} #${u.from} → #${u.to} — ${fmtValue(board, u.value)}`);
    }
    const lines = headlines.slice(0, 8);
    if (headlines.length > 8) lines.push(`…and ${headlines.length - 8} more changes`);

    const consequences = [];
    const downs = [...d.rankDowns].sort((a, b) => a.to - b.to);
    const exits = [...d.exits].sort((a, b) => a.lastRank - b.lastRank);
    const exitLabel = (x) => {
      const cur = currentRank.get(x.username);
      return cur ? `${escapeName(x.username)} (now #${cur})` : escapeName(x.username);
    };
    if (downs.length) {
      const shown = settings.singlePush ? downs.slice(0, 1) : downs;
      const rest = downs.length - shown.length;
      consequences.push(`Pushed down: ${shown.map((x) => `${escapeName(x.username)} #${x.from}→#${x.to}`).join(', ')}${rest > 0 ? ` (+${rest} more)` : ''}`);
    }
    if (exits.length) {
      const shown = settings.singlePush ? exits.slice(0, 1) : exits;
      const rest = exits.length - shown.length;
      consequences.push(`Fell out: ${shown.map(exitLabel).join(', ')}${rest > 0 ? ` (+${rest} more)` : ''}`);
    }
    if (d.renames.length) consequences.push(`Renamed: ${d.renames.map((r) => `${escapeName(r.from)} → ${escapeName(r.to)}`).join(', ')}`);
    if (consequences.length) lines.push(truncate(`${emojis.down} ${consequences.join(' · ')}`, 400));
    return truncate(lines.join('\n'), 800) || '—';
  };

  const buildMessage = (changed, settings) => {
    const fields = [];
    for (const board of boards) {
      const d = changed.get(board.key);
      if (!d) continue;
      const currentRows = getBoard(board.key).rows;
      const context = (state.boards[board.key] && state.boards[board.key].context) || [];
      fields.push({ name: `${board.emoji} ${board.label}`, value: renderBoardValue(board, d, currentRows, context, settings), inline: false });
    }
    return {
      content: `<@&${cfg.roleId}>`,
      embeds: [{
        title: `${emojis.update} Leaderboard update`,
        color: colors.brand,
        description: `All-time boards · top ${settings.topN} · ${discordTimestamp(now(), 'R')}`,
        fields,
      }],
      allowedMentions: { parse: [], roles: [cfg.roleId] },
    };
  };

  const evaluate = async (fetchedKeys) => {
    const settings = getSettings();
    const topN = settings.topN;
    const contextN = Math.max(25, topN * 2);
    const baseline = (rows) => ({ updatedAt: now(), topN, top: minify(rows, topN), context: minify(rows, contextN) });

    if (!state) {
      const loaded = await loadState('leaderboard');
      state = loaded && loaded.version === 1 && loaded.boards ? loaded : { version: 1, lastAnnouncedAt: 0, boards: {} };
    }
    let dirty = false;
    const changed = new Map();
    for (const key of fetchedKeys) {
      const snapshot = getBoard(key);
      if (!snapshot) continue;
      const existing = state.boards[key];
      if (!existing || !Array.isArray(existing.top)) {
        state.boards[key] = baseline(snapshot.rows);
        dirty = true;
        continue;
      }
      if (existing.topN !== topN) {
        state.boards[key] = baseline(snapshot.rows);
        dirty = true;
        log.info(`${key}: tracked positions changed to ${topN}, baseline reset silently`);
        continue;
      }
      const d = diffTop(existing.top, minify(snapshot.rows, topN));
      if (isEmptyDiff(d)) continue;
      if (!hasRealEvents(d)) {
        state.boards[key] = baseline(snapshot.rows);
        dirty = true;
        log.info(`${key}: rename detected (${d.renames.map((r) => `${r.from} → ${r.to}`).join(', ')}), baseline updated silently`);
        continue;
      }
      changed.set(key, d);
    }
    if (dirty) await saveState('leaderboard', state);
    if (!changed.size) return;
    if (now() - (state.lastAnnouncedAt || 0) < cfg.flushMinutes * 60000) return;
    const payload = buildMessage(changed, settings);
    try {
      await sendMessage(payload);
    } catch (err) {
      log.warn(`announce failed, retrying: ${err.message}`);
      await sleep(5000);
      try {
        await sendMessage(payload);
      } catch (err2) {
        log.error(`announce failed twice, dropping: ${err2.message}`);
        return;
      }
    }
    for (const key of changed.keys()) {
      state.boards[key] = baseline(getBoard(key).rows);
    }
    state.lastAnnouncedAt = now();
    await saveState('leaderboard', state);
  };

  return { evaluate };
}
