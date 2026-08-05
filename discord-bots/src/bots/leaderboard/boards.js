import { apiPost } from '../../lib/api.js';
import { emojis } from '../../lib/emojis.js';

export const boards = [
  { key: 'coins', kind: 'games', sortBy: 'coins', label: 'Coins', emoji: emojis.boards.coins, duration: false },
  { key: 'kills', kind: 'games', sortBy: 'kills', label: 'Kills', emoji: emojis.boards.kills, duration: false },
  { key: 'survived', kind: 'games', sortBy: 'playtime', label: 'Survived', emoji: emojis.boards.survived, duration: true },
  { key: 'xp', kind: 'stats', sortBy: 'xp', label: 'XP', emoji: emojis.boards.xp, duration: false },
  { key: 'mastery', kind: 'stats', sortBy: 'mastery', label: 'Mastery', emoji: emojis.boards.mastery, duration: false },
  { key: 'totalKills', kind: 'stats', sortBy: 'kills', label: 'Total Stabs', emoji: emojis.boards.totalKills, duration: false },
  { key: 'totalPlaytime', kind: 'stats', sortBy: 'playtime', label: 'Total Playtime', emoji: emojis.boards.totalPlaytime, duration: true },
];

export const boardByKey = (key) => boards.find((b) => b.key === key);

export function dedupeAllTimeGames(rows, sortBy) {
  const byAccount = new Map();
  for (const row of rows) {
    const k = row.username || 'unknown';
    if (!byAccount.has(k)) byAccount.set(k, []);
    byAccount.get(k).push(row);
  }
  const sortFunc = (a, b) => (b[sortBy] || 0) - (a[sortBy] || 0);
  const top = [];
  byAccount.forEach((games) => top.push([...games].sort(sortFunc)[0]));
  top.sort(sortFunc);
  return top.slice(0, 100);
}

export function dedupeStatsRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row.username)) continue;
    seen.add(row.username);
    out.push(row);
  }
  return out;
}

export function normalizeGamesRow(row, sortBy) {
  const normalized = {
    username: row.username || 'unknown',
    clanTag: row.clan_tag || null,
    coins: Number(row.coins) || 0,
    kills: Number(row.kills) || 0,
    playtime: Number(row.playtime) || 0,
    date: row.date,
  };
  normalized.value = normalized[sortBy];
  normalized.fp = `${String(row.date)}|${normalized.coins}|${normalized.kills}|${normalized.playtime}`;
  return normalized;
}

export function normalizeStatsRow(row, sortBy) {
  const normalized = {
    username: row.username || 'unknown',
    clanTag: row.clan_tag || null,
    xp: Number(row.xp) || 0,
    coins: Number(row.coins) || 0,
    kills: Number(row.kills) || 0,
    mastery: Number(row.mastery) || 0,
    playtime: Number(row.playtime) || 0,
  };
  normalized.value = normalized[sortBy];
  return normalized;
}

export async function fetchBoard(board, timeRange = 'all') {
  if (board.kind === 'games') {
    const limit = timeRange === 'all' ? 1000 : 100;
    const raw = await apiPost('/games/fetch', { sortBy: board.sortBy, timeRange, limit });
    const rows = Array.isArray(raw) ? raw : [];
    const picked = timeRange === 'all' ? dedupeAllTimeGames(rows, board.sortBy) : rows;
    return picked.map((row) => normalizeGamesRow(row, board.sortBy));
  }
  const raw = await apiPost('/stats/fetch', { sortBy: board.sortBy, timeRange, limit: 100 });
  const rows = Array.isArray(raw) ? raw : [];
  return dedupeStatsRows(rows).map((row) => normalizeStatsRow(row, board.sortBy));
}
