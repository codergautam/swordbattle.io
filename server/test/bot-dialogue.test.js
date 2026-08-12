const test = require('node:test');
const assert = require('node:assert/strict');
const Dialogue = require('../src/game/ai/BotDialogue');

test('dialogue system exposes more than 800 unique visible lines', () => {
  const lines = Dialogue.allLines('Teammate');
  assert.ok(Dialogue.lineCount() >= 800);
  assert.ok(new Set(lines).size >= 800);
  assert.ok(lines.every(line => line.length > 0 && line.length <= 60));
});

test('all dialogue situations can generate deterministic lines', () => {
  for (const situation of Dialogue.situations) {
    const first = Dialogue.getLine(situation, { name: 'Rival' }, () => 0);
    const last = Dialogue.getLine(situation, { name: 'Rival' }, () => 0.999999);
    assert.notEqual(first, last);
    assert.match(first, /^[A-Z]/);
  }
});
