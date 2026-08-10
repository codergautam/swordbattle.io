const test = require('node:test');
const assert = require('node:assert/strict');
const Types = require('../src/game/Types');
const {
  MAX_INPUT_EVENTS,
  MAX_MOUSE_FORCE,
  normalizeAngle,
  sanitizeInputEvents,
  sanitizeMouse,
} = require('../src/game/components/InputSanitizer');

test('normalizeAngle accepts zero and wraps extreme angles', () => {
  assert.equal(normalizeAngle(0), 0);
  assert.ok(Math.abs(normalizeAngle(Math.PI * 5) - Math.PI) < 1e-9);
  assert.equal(normalizeAngle(Number.NaN), null);
  assert.equal(normalizeAngle(Infinity), null);
});

test('sanitizeInputEvents rejects unknown inputs and caps each packet', () => {
  const events = [
    { inputType: Types.Input.Up, inputDown: true },
    { inputType: 999, inputDown: true },
    { inputType: Types.Input.SwordSwing, inputDown: 'yes' },
    ...Array.from({ length: 30 }, () => ({ inputType: Types.Input.Left, inputDown: true })),
  ];

  const sanitized = sanitizeInputEvents(events);
  assert.equal(sanitized.length, MAX_INPUT_EVENTS - 1);
  assert.deepEqual(sanitized[0], { inputType: Types.Input.Up, inputDown: true });
  assert.deepEqual(sanitized[1], { inputType: Types.Input.SwordSwing, inputDown: false });
});

test('sanitizeMouse clamps force and rejects malformed coordinates', () => {
  assert.deepEqual(sanitizeMouse({ angle: 0, force: 999 }), {
    angle: 0,
    force: MAX_MOUSE_FORCE,
  });
  assert.equal(sanitizeMouse({ angle: 'nope', force: 10 }), null);
  assert.equal(sanitizeMouse({ angle: 1, force: Infinity }), null);
});
