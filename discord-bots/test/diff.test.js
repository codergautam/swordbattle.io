import test from 'node:test';
import assert from 'node:assert/strict';
import { diffTop, isEmptyDiff } from '../src/bots/leaderboard/diff.js';

const rows = (...names) => names.map((n, i) => ({ username: n, value: 1000 - i * 10 }));

test('no change produces empty diff', () => {
  const top = rows('A', 'B', 'C');
  const d = diffTop(top, rows('A', 'B', 'C'));
  assert.equal(isEmptyDiff(d), true);
});

test('value-only increase at same rank is not an event', () => {
  const oldTop = rows('A', 'B', 'C');
  const newTop = rows('A', 'B', 'C').map((r) => ({ ...r, value: r.value + 500 }));
  const d = diffTop(oldTop, newTop);
  assert.equal(isEmptyDiff(d), true);
});

test('new player entering at #3 yields one entry, cascade downs, one exit', () => {
  const oldTop = rows('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J');
  const newTop = rows('A', 'B', 'N', 'C', 'D', 'E', 'F', 'G', 'H', 'I');
  const d = diffTop(oldTop, newTop);
  assert.deepEqual(d.newEntries.map((x) => `${x.username}:${x.rank}:${x.value}`), ['N:3:980']);
  assert.deepEqual(d.rankUps, []);
  assert.deepEqual(d.rankDowns.map((x) => `${x.username}:${x.from}->${x.to}`), [
    'C:3->4', 'D:4->5', 'E:5->6', 'F:6->7', 'G:7->8', 'H:8->9', 'I:9->10',
  ]);
  assert.equal(d.exits.length, 1);
  assert.equal(d.exits[0].username, 'J');
  assert.equal(d.exits[0].lastRank, 10);
});

test('swap of top two yields one rankUp and one rankDown', () => {
  const oldTop = rows('A', 'B', 'C');
  const newTop = rows('B', 'A', 'C');
  const d = diffTop(oldTop, newTop);
  assert.deepEqual(d.rankUps.map((x) => `${x.username}:${x.from}->${x.to}`), ['B:2->1']);
  assert.deepEqual(d.rankDowns.map((x) => `${x.username}:${x.from}->${x.to}`), ['A:1->2']);
  assert.equal(d.newEntries.length, 0);
  assert.equal(d.exits.length, 0);
});

test('rename with identical value is detected as a rename, not exit+entry', () => {
  const oldTop = rows('A', 'B', 'C');
  const newTop = rows('A', 'B', 'Cx');
  const d = diffTop(oldTop, newTop);
  assert.deepEqual(d.renames, [{ from: 'C', to: 'Cx', rank: 3, value: 980 }]);
  assert.equal(d.newEntries.length, 0);
  assert.equal(d.exits.length, 0);
  assert.equal(d.rankUps.length, 0);
  assert.equal(d.rankDowns.length, 0);
  assert.equal(isEmptyDiff(d), false);
});

test('rename detection matches by game fingerprint when both sides have one', () => {
  const oldTop = [
    { username: 'A', value: 100, fp: 'g1' },
    { username: 'B', value: 90, fp: 'g2' },
  ];
  const newTop = [
    { username: 'A', value: 100, fp: 'g1' },
    { username: 'B2', value: 90, fp: 'g2' },
  ];
  const d = diffTop(oldTop, newTop);
  assert.deepEqual(d.renames.map((r) => `${r.from}->${r.to}`), ['B->B2']);
  assert.equal(d.exits.length, 0);
  assert.equal(d.newEntries.length, 0);
});

test('same value but different game fingerprints stays exit+entry', () => {
  const oldTop = [
    { username: 'A', value: 100, fp: 'g1' },
    { username: 'B', value: 90, fp: 'g2' },
  ];
  const newTop = [
    { username: 'A', value: 100, fp: 'g1' },
    { username: 'C', value: 90, fp: 'g3' },
  ];
  const d = diffTop(oldTop, newTop);
  assert.equal(d.renames.length, 0);
  assert.deepEqual(d.exits.map((x) => x.username), ['B']);
  assert.deepEqual(d.newEntries.map((x) => x.username), ['C']);
});

test('exit and entry with different values stay separate events', () => {
  const oldTop = [
    { username: 'A', value: 100 },
    { username: 'B', value: 90 },
  ];
  const newTop = [
    { username: 'A', value: 100 },
    { username: 'C', value: 95 },
  ];
  const d = diffTop(oldTop, newTop);
  assert.equal(d.renames.length, 0);
  assert.deepEqual(d.exits.map((x) => x.username), ['B']);
  assert.deepEqual(d.newEntries.map((x) => x.username), ['C']);
});

test('mid-board removal yields exit, rankUps, and a new #10', () => {
  const oldTop = rows('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J');
  const newTop = rows('A', 'B', 'C', 'D', 'F', 'G', 'H', 'I', 'J', 'K');
  const d = diffTop(oldTop, newTop);
  assert.deepEqual(d.exits.map((x) => `${x.username}:${x.lastRank}`), ['E:5']);
  assert.deepEqual(d.rankUps.map((x) => `${x.username}:${x.from}->${x.to}`), [
    'F:6->5', 'G:7->6', 'H:8->7', 'I:9->8', 'J:10->9',
  ]);
  assert.deepEqual(d.newEntries.map((x) => `${x.username}:${x.rank}`), ['K:10']);
  assert.equal(d.rankDowns.length, 0);
  assert.equal(d.renames.length, 0);
});
