const test = require('node:test');
const assert = require('node:assert/strict');
const Types = require('../src/game/Types');
const DashSystem = require('../src/game/components/DashSystem');

function makePlayer() {
  return {
    removed: false,
    inSafezone: false,
    modifiers: {},
    cards: { choosingCard: false, instantSelect: false },
    speed: { multiplier: 1 },
    movementDirection: 0,
    hypnotizedBy: null,
  };
}

test('a valid double tap activates a directional dash', () => {
  const player = makePlayer();
  const dash = new DashSystem(player);

  assert.equal(dash.onDirectionInput(Types.Input.Right, 1000), false);
  assert.equal(dash.onDirectionInput(Types.Input.Right, 1200), true);
  dash.update(0.05);

  assert.equal(player.speed.multiplier, DashSystem.DEFAULTS.speedMultiplier);
  assert.equal(player.modifiers.dashNoclip, true);
  assert.equal(player.modifiers.dashDirection, 0);
  assert.equal(dash.status, 'active');
});

test('dash respects safety, control locks, cooldown, and interruption', () => {
  const player = makePlayer();
  const dash = new DashSystem(player);

  player.inSafezone = true;
  dash.onDirectionInput(Types.Input.Up, 1000);
  assert.equal(dash.onDirectionInput(Types.Input.Up, 1100), false);

  player.inSafezone = false;
  dash.onDirectionInput(Types.Input.Up, 2000);
  assert.equal(dash.onDirectionInput(Types.Input.Up, 2100), true);
  dash.interrupt();
  assert.notEqual(dash.status, 'active');

  dash.onDirectionInput(Types.Input.Up, 3000);
  assert.equal(dash.onDirectionInput(Types.Input.Up, 3100), false);
});
