import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeAllTimeGames, dedupeStatsRows, normalizeGamesRow, normalizeStatsRow } from '../src/bots/leaderboard/boards.js';

test('dedupeAllTimeGames keeps only the best game per username', () => {
  const rows = [
    { username: 'A', coins: 900, kills: 1, playtime: 100 },
    { username: 'B', coins: 700, kills: 2, playtime: 200 },
    { username: 'A', coins: 500, kills: 3, playtime: 300 },
    { username: 'C', coins: 800, kills: 4, playtime: 400 },
  ];
  const out = dedupeAllTimeGames(rows, 'coins');
  assert.deepEqual(out.map((r) => `${r.username}:${r.coins}`), ['A:900', 'C:800', 'B:700']);
});

test('dedupeAllTimeGames picks best by the requested stat', () => {
  const rows = [
    { username: 'A', coins: 900, kills: 1, playtime: 100 },
    { username: 'A', coins: 500, kills: 50, playtime: 300 },
  ];
  const out = dedupeAllTimeGames(rows, 'kills');
  assert.equal(out.length, 1);
  assert.equal(out[0].kills, 50);
});

test('dedupeStatsRows drops duplicate usernames keeping first', () => {
  const rows = [
    { username: 'A', xp: 100 },
    { username: 'A', xp: 100 },
    { username: 'B', xp: 90 },
  ];
  const out = dedupeStatsRows(rows);
  assert.deepEqual(out.map((r) => r.username), ['A', 'B']);
});

test('normalizeStatsRow coerces string aggregates to numbers and sets value', () => {
  const row = normalizeStatsRow({ username: 'A', clan_tag: 'TAG', xp: '12345', coins: '10', kills: '5', mastery: '2', playtime: '600' }, 'xp');
  assert.equal(row.xp, 12345);
  assert.equal(row.value, 12345);
  assert.equal(row.playtime, 600);
  assert.equal(row.clanTag, 'TAG');
});

test('normalizeGamesRow maps fields and sets value by sortBy', () => {
  const row = normalizeGamesRow({ username: 'A', clan_tag: null, coins: 100, kills: 7, playtime: 1800, date: '2026-08-01T00:00:00.000Z' }, 'playtime');
  assert.equal(row.value, 1800);
  assert.equal(row.clanTag, null);
  assert.equal(row.date, '2026-08-01T00:00:00.000Z');
  assert.equal(row.fp, '2026-08-01T00:00:00.000Z|100|7|1800');
});
