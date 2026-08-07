import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, formatNumber, medal, parseColor, reactionIdentifier } from '../src/lib/embeds.js';

test('reactionIdentifier converts custom emoji tags to the react format', () => {
  assert.equal(reactionIdentifier('<:sb_above:1534686959337996390>'), 'sb_above:1534686959337996390');
  assert.equal(reactionIdentifier('<a:spin:123456789>'), 'spin:123456789');
});

test('reactionIdentifier passes unicode emoji through untouched', () => {
  assert.equal(reactionIdentifier('👍'), '👍');
  assert.equal(reactionIdentifier('  ✅ '), '✅');
});

test('parseColor accepts hex with or without hash and falls back otherwise', () => {
  assert.equal(parseColor('#ffd700', 1), 0xffd700);
  assert.equal(parseColor('2ecc71', 1), 0x2ecc71);
  assert.equal(parseColor('nope', 42), 42);
  assert.equal(parseColor(null, 42), 42);
});

test('formatDuration mirrors the site formatting', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(59), '59s');
  assert.equal(formatDuration(3600), '1h');
  assert.equal(formatDuration(3725), '1h 2m 5s');
});

test('formatNumber adds thousands separators', () => {
  assert.equal(formatNumber(1234567), '1,234,567');
  assert.equal(formatNumber(null), '0');
});

test('medal returns bold rank text past third place', () => {
  assert.equal(medal(4), '**#4**');
});
