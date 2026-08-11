const test = require('node:test');
const assert = require('node:assert/strict');
const DevelopmentAdminCommands = require('../src/game/components/DevelopmentAdminCommands');

function fixture(enabled) {
  let outbreakCalls = 0;
  let granted = 0;
  const game = {
    worldEventDirector: { summonOutbreak() { outbreakCalls += 1; return true; } },
  };
  const player = {
    isBot: false,
    levels: { addCoins(amount) { granted += amount; } },
    messages: [],
    setSystemMessage(message) { this.messages.push(message); },
  };
  return {
    commands: new DevelopmentAdminCommands(game, { enabled }), player,
    get outbreakCalls() { return outbreakCalls; },
    get granted() { return granted; },
  };
}

test('development admins can summon outbreaks and grant bounded coins', () => {
  const f = fixture(true);
  assert.equal(f.commands.handleCommand(f.player, '/admin outbreak'), true);
  assert.equal(f.outbreakCalls, 1);
  assert.equal(f.commands.handleCommand(f.player, '/admin coins 25000'), true);
  assert.equal(f.granted, 25000);
  f.commands.handleCommand(f.player, '/admin coins 10000001');
  assert.equal(f.granted, 25000);
});

test('admin commands are entirely unavailable outside development', () => {
  const f = fixture(false);
  assert.equal(f.commands.handleCommand(f.player, '/admin outbreak'), false);
  assert.equal(f.commands.handleCommand(f.player, '/admin coins 500'), false);
  assert.equal(f.outbreakCalls, 0);
  assert.equal(f.granted, 0);
});
