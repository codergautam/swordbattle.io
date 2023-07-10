class Client {
  constructor(socket, ip) {
    this.socket = socket;
    this.ip = ip;
    this.server = null;
    this.player = null;
    this.messages = [];
    this.pingTimer = 0;
    this.disconnectReason = 'Server';
    this.isSocketClosed = false;
  }

  addMessage(message) {
    this.messages.push(message);
  }

  update() {
    if (this.isSocketClosed) return;

    this.pingTimer -= 1;
    if (this.pingTimer <= 0) {
      this.socket.ping();
      this.pingTimer = 900;
    }
  }
}

class Server {
  constructor(game) {
    this.game = game;
    this.clients = new Set();
    this.disconnectedClients = new Set();
  }

  get online() {
    return this.game.players.size;
  }

  getInformation() {
    return {
      online: this.online,
    };
  }

  addClient(client) {
    this.clients.add(client);
    client.server = this;
  }

  removeClient(client) {
    this.disconnectedClients.add(client);
  }

  tick(dt) {
    for (const client of this.clients) {
      client.update();
      for (const message of client.messages) {
        this.game.processClientMessage(client, message);
      }
      client.messages = [];
    }

    this.game.tick(dt);

    for (const client of this.disconnectedClients) {
      this.game.removeClient(client);
      this.clients.delete(client);
      this.disconnectedClients.delete(client);
    }
    for (const client of this.clients) {
      const payload = this.game.createPayload(client);
      if (payload !== null && !client.isSocketClosed) {
        client.socket.send(payload, {binary: true, compress: true});
      }
    }

    this.game.endTick();
  }
}

module.exports = {
  Server,
  Client,
};
