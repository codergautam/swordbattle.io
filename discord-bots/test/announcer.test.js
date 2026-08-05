import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnnouncer } from '../src/bots/leaderboard/announcer.js';

const mkRows = (...names) => names.map((n, i) => ({ username: n, clanTag: null, value: 1000 - i * 10 }));
const minified = (rows, n) => rows.slice(0, n).map((r) => ({ username: r.username, clanTag: r.clanTag || null, value: r.value }));

function makeHarness({ flushMinutes = 5, initialState = null } = {}) {
  const harness = {
    clock: 10000000,
    sent: [],
    failSends: 0,
    stateStore: initialState,
    snapshots: new Map(),
  };
  harness.announcer = createAnnouncer({
    getBoard: (key) => harness.snapshots.get(key),
    sendMessage: async (payload) => {
      if (harness.failSends > 0) {
        harness.failSends -= 1;
        throw new Error('send fail');
      }
      harness.sent.push(payload);
    },
    loadState: async () => harness.stateStore,
    saveState: async (name, data) => {
      harness.stateStore = JSON.parse(JSON.stringify(data));
    },
    log: { info() {}, warn() {}, error() {} },
    cfg: { roleId: '123', flushMinutes },
    now: () => harness.clock,
    sleep: async () => {},
  });
  harness.setBoard = (key, rows) => harness.snapshots.set(key, { fetchedAt: harness.clock, rows });
  return harness;
}

function preloaded(clock, boardsSpec) {
  const boards = {};
  for (const [key, rows] of Object.entries(boardsSpec)) {
    boards[key] = { updatedAt: clock, top: minified(rows, 10), context: minified(rows, 25) };
  }
  return { version: 1, lastAnnouncedAt: clock, boards };
}

test('missing state baselines silently with no sends', async () => {
  const h = makeHarness();
  h.setBoard('xp', mkRows('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'));
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 0);
  assert.equal(h.stateStore.boards.xp.top.length, 10);
  assert.equal(h.stateStore.boards.xp.context.length, 12);
});

test('change inside cooldown is held and baseline unchanged', async () => {
  const base = mkRows('A', 'B', 'C');
  const h = makeHarness({ initialState: preloaded(10000000, { xp: base }) });
  h.clock += 60000;
  h.setBoard('xp', mkRows('B', 'A', 'C'));
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 0);
  assert.deepEqual(h.stateStore.boards.xp.top.map((r) => r.username), ['A', 'B', 'C']);
});

test('flap that reverts before cooldown expiry is never announced', async () => {
  const base = mkRows('A', 'B', 'C');
  const h = makeHarness({ initialState: preloaded(10000000, { xp: base }) });
  h.clock += 60000;
  h.setBoard('xp', mkRows('B', 'A', 'C'));
  await h.announcer.evaluate(['xp']);
  h.clock += 60000;
  h.setBoard('xp', mkRows('A', 'B', 'C'));
  await h.announcer.evaluate(['xp']);
  h.clock += 10 * 60000;
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 0);
});

test('persistent change announces once after cooldown with one ping and compact lines', async () => {
  const base = mkRows('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J');
  const h = makeHarness({ initialState: preloaded(10000000, { xp: base }) });
  h.clock += 6 * 60000;
  h.setBoard('xp', mkRows('A', 'B', 'N', 'C', 'D', 'E', 'F', 'G', 'H', 'I'));
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 1);
  const payload = h.sent[0];
  assert.equal(payload.content, '<@&123>');
  assert.deepEqual(payload.allowedMentions.roles, ['123']);
  const field = payload.embeds[0].fields[0];
  const lines = field.value.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('N') && lines[0].includes('entered at #3'));
  assert.ok(lines[1].includes('Pushed down: '));
  assert.ok(lines[1].includes('Fell out: J'));
  assert.deepEqual(h.stateStore.boards.xp.top.map((r) => r.username), ['A', 'B', 'N', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  assert.equal(h.stateStore.lastAnnouncedAt, h.clock);
});

test('double send failure drops message without mutating baseline, then re-announces', async () => {
  const base = mkRows('A', 'B', 'C');
  const h = makeHarness({ initialState: preloaded(10000000, { xp: base }) });
  h.clock += 6 * 60000;
  h.setBoard('xp', mkRows('B', 'A', 'C'));
  h.failSends = 2;
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 0);
  assert.deepEqual(h.stateStore.boards.xp.top.map((r) => r.username), ['A', 'B', 'C']);
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.stateStore.boards.xp.top.map((r) => r.username), ['B', 'A', 'C']);
});

test('multiple changed boards produce one message with one field per board', async () => {
  const h = makeHarness({
    initialState: preloaded(10000000, { xp: mkRows('A', 'B', 'C'), coins: mkRows('X', 'Y', 'Z') }),
  });
  h.clock += 6 * 60000;
  h.setBoard('xp', mkRows('B', 'A', 'C'));
  h.setBoard('coins', mkRows('Y', 'X', 'Z'));
  await h.announcer.evaluate(['xp', 'coins']);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].embeds[0].fields.length, 2);
});

test('new entry previously in context 11-25 gets a was-note', async () => {
  const names = Array.from({ length: 15 }, (_, i) => `P${i + 1}`);
  const h = makeHarness({ initialState: preloaded(10000000, { xp: mkRows(...names) }) });
  h.clock += 6 * 60000;
  const reordered = ['P14', ...names.filter((n) => n !== 'P14')];
  h.setBoard('xp', mkRows(...reordered));
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 1);
  const value = h.sent[0].embeds[0].fields[0].value;
  assert.ok(value.includes('New #1:') && value.includes('P14') && value.includes('(was #14)'));
});

test('rename-only change silently rebaselines without announcing', async () => {
  const h = makeHarness({ initialState: preloaded(10000000, { xp: mkRows('A', 'B', 'C') }) });
  h.clock += 6 * 60000;
  h.setBoard('xp', mkRows('A', 'B', 'C2'));
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 0);
  assert.deepEqual(h.stateStore.boards.xp.top.map((r) => r.username), ['A', 'B', 'C2']);
});

test('rename alongside a real change is mentioned in the announcement', async () => {
  const h = makeHarness({ initialState: preloaded(10000000, { xp: mkRows('A', 'B', 'C', 'D') }) });
  h.clock += 6 * 60000;
  const next = mkRows('B', 'A', 'C2', 'D');
  h.setBoard('xp', next);
  await h.announcer.evaluate(['xp']);
  assert.equal(h.sent.length, 1);
  const value = h.sent[0].embeds[0].fields[0].value;
  assert.ok(value.includes('Renamed: C → C2'));
  assert.deepEqual(h.stateStore.boards.xp.top.map((r) => r.username), ['B', 'A', 'C2', 'D']);
});
