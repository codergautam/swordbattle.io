import { apiPost, ApiError } from '../../../lib/api.js';
import { boards } from '../boards.js';
import { colors, discordTimestamp, escapeName, formatDuration, formatNumber, truncate } from '../../../lib/embeds.js';
import { emojis } from '../../../lib/emojis.js';

export const def = {
  name: 'player',
  description: 'Look up a swordbattle.io player profile',
  options: [
    { type: 3, name: 'name', description: 'Player username', required: true, autocomplete: true, max_length: 40 },
  ],
};

const fetchInfo = async (username) => {
  try {
    return await apiPost(`/profile/getPublicUserInfo/${encodeURIComponent(username)}`, {});
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
};

export async function resolvePlayer(nameRaw) {
  const name = String(nameRaw || '').trim();
  if (!name) return null;
  let rows = [];
  try {
    rows = await apiPost('/profile/search', { q: name, limit: 20 });
  } catch {
    rows = [];
  }
  const match = Array.isArray(rows) ? rows.find((r) => String(r.username).toLowerCase() === name.toLowerCase()) : null;
  if (match) {
    const info = await fetchInfo(match.username);
    if (info) return info;
  }
  return fetchInfo(name);
}

export async function notFoundReply(interaction, name) {
  await interaction.editReply({
    embeds: [{ color: colors.error, description: `${emojis.error} No player found matching "${truncate(escapeName(name), 60)}".` }],
  });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
}

export async function autocomplete(interaction) {
  const q = String(interaction.options.getFocused() || '').trim();
  if (!q) {
    await interaction.respond([]).catch(() => {});
    return;
  }
  try {
    const rows = await apiPost('/profile/search', { q, limit: 20 }, { timeoutMs: 2000, retries: 0 });
    const choices = (Array.isArray(rows) ? rows : []).slice(0, 20).map((r) => ({
      name: truncate(r.username, 100),
      value: truncate(r.username, 100),
    }));
    await interaction.respond(choices);
  } catch {
    await interaction.respond([]).catch(() => {});
  }
}

export async function run(interaction, ctx) {
  await interaction.deferReply();
  const name = interaction.options.getString('name');
  const info = await resolvePlayer(name);
  if (!info || !info.account) {
    await notFoundReply(interaction, name);
    return;
  }
  const account = info.account;
  const stats = info.totalStats || {};
  const clanTag = info.clan && info.clan.clan ? info.clan.clan.tag : null;
  const rankingLines = [];
  const missing = [];
  let warming = false;
  for (const board of boards) {
    const snap = ctx.poller.getBoard(board.key);
    if (!snap) {
      warming = true;
      continue;
    }
    const idx = snap.rows.findIndex((r) => r.username === account.username);
    if (idx >= 0) {
      const fmt = board.duration ? formatDuration : formatNumber;
      rankingLines.push(`${board.emoji} ${board.label}: **#${idx + 1}** — ${fmt(snap.rows[idx].value)}`);
    } else {
      missing.push(board.label);
    }
  }
  let rankingsValue;
  if (warming && !rankingLines.length) {
    rankingsValue = 'Rankings are warming up, try again in a minute.';
  } else {
    if (missing.length) rankingLines.push(`Not in top 100: ${missing.join(', ')}`);
    rankingsValue = rankingLines.join('\n');
  }
  const fields = [
    { name: 'Created', value: `${discordTimestamp(account.created_at, 'D')} (${discordTimestamp(account.created_at, 'R')})`, inline: true },
    { name: 'All-time XP rank', value: info.rank ? `#${formatNumber(info.rank)}` : 'Unranked', inline: true },
    { name: 'XP', value: formatNumber(stats.xp), inline: true },
    { name: 'Coins', value: formatNumber(stats.coins), inline: true },
    { name: 'Kills', value: formatNumber(stats.kills), inline: true },
    { name: 'Mastery', value: formatNumber(stats.mastery), inline: true },
    { name: 'Games', value: formatNumber(stats.games), inline: true },
    { name: 'Playtime', value: formatDuration(stats.playtime), inline: true },
    { name: 'Login streak', value: formatNumber(stats.login_streak), inline: true },
    { name: 'Top-100 rankings', value: truncate(rankingsValue, 1024), inline: false },
  ];
  await interaction.editReply({
    embeds: [{
      title: `${clanTag ? `[${escapeName(clanTag)}] ` : ''}${escapeName(account.username)}`,
      color: colors.brand,
      fields,
      footer: { text: 'swordbattle.io' },
    }],
  });
}
