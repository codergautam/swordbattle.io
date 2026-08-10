const test = require('node:test');
const assert = require('node:assert/strict');
const Client = require('../src/network/Client');

function createClient() {
  let closeCount = 0;
  const socket = {
    id: 'test-client',
    ip: '127.0.0.1',
    close() { closeCount++; },
    ping() {},
    send() { return 1; },
  };
  const game = { players: new Set(), tps: 20 };
  const client = new Client(game, socket);
  return { client, get closeCount() { return closeCount; } };
}

test('message limits reset on wall time instead of server tick count', () => {
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    const fixture = createClient();
    fixture.client.maxMessagesPerSecond = 2;
    fixture.client.maxQueueSize = 20;

    fixture.client.addMessage({ play: true });
    fixture.client.addMessage({ play: true });
    assert.equal(fixture.closeCount, 0);

    fixture.client.addMessage({ play: true });
    assert.equal(fixture.closeCount, 1);

    now += 1001;
    fixture.client.addMessage({ play: true });
    assert.equal(fixture.client.messageCount, 1);
  } finally {
    Date.now = originalNow;
  }
});

test('queue limits close a flooding client before memory grows unbounded', () => {
  const fixture = createClient();
  fixture.client.maxMessagesPerSecond = 1000;
  fixture.client.maxQueueSize = 2;

  fixture.client.addMessage({ play: true });
  fixture.client.addMessage({ play: true });
  fixture.client.addMessage({ play: true });

  assert.equal(fixture.client.messages.length, 2);
  assert.equal(fixture.closeCount, 1);
  assert.equal(fixture.client.disconnectReason.message, 'Message queue overflow');
});
