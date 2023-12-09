const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');

class Server {
  constructor(game) {
    this.game = game;
    this.clients = new Map();
    this.disconnectedClients = new Set();
  }

  get online() {
    return this.game.players.size;
  }

  initialize(app) {
    app.ws('/*', {
      compression: uws.SHARED_COMPRESSOR,
      idleTimeout: 32,
      maxPayloadLength: 512,
      upgrade:(res, req, context) => {
        res.upgrade({ id: uuidv4() },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'), context,
        );
      },
      open: (socket) => {
        console.log(`Client ${socket.id} connected.`);
        const client = new Client(this.game, socket);
        this.addClient(client);
      },
      message: (socket, message) => {
        const client = this.clients.get(socket.id);
        const data = Protocol.decode(message);
        if (data) {
          client.addMessage(data);
        }
      },
      close: (socket, code) => {
        const client = this.clients.get(socket.id);
        client.isSocketClosed = true;
        if (client.player) {
          client.player.remove()
        }
        this.removeClient(client);
        console.log(`Client disconnected with code ${code}.`);
      }
    });
  }

  getInformation() {
    return {
      online: this.online,
    };
  }

  addClient(client) {
    client.server = this;
    this.clients.set(client.id, client);
  }

  removeClient(client) {
    this.disconnectedClients.add(client);
  }

  async tick(dt) {
    for (const client of this.clients.values()) {
      if (!client.isReady) continue;

      client.update(dt);
      for (const message of client.messages) {
        await this.game.processClientMessage(client, message);
      }
      client.messages = [];
    }

    this.game.tick(dt);

    for (const client of this.disconnectedClients) {
      this.game.removeClient(client);
      this.clients.delete(client.id);
      this.disconnectedClients.delete(client);
    }
    for (const client of this.clients.values()) {
      const payload = this.game.createPayload(client);
      if (payload !== null && !client.isSocketClosed) {
        client.socket.send(payload, { binary: true, compress: true });
      }
    }

    this.game.endTick();
    this.clients.forEach(client => client.cleanup());
  }
}

module.exports = Server;
