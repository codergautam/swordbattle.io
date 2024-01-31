const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');
const { getBannedIps } = require('../moderation');

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
      maxPayloadLength: 2048,
      upgrade: (res, req, context) => {

        res.upgrade({ id: uuidv4(), ip: req.getHeader('x-forwarded-for') || req.getHeader('cf-connecting-ip') || '' },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'), context,
        );
      },
      open: (socket) => {
        const client = new Client(this.game, socket);
        if (getBannedIps().includes(client.ip)) {
          client.socket.close();
          console.log(`Client ${client.id} (${client.ip}) tried to connect but is banned.`);
          return;
        }
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
        try {
          const client = this.clients.get(socket.id);
          client.isSocketClosed = true;
          if (client.player && !client.player.removed) {
            client.player.remove()
          }
          this.removeClient(client);
          console.log(`Client disconnected with code ${code}.`);
        } catch (e) {
        }
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

  tick(dt) {
    for (const client of this.clients.values()) {
      if (!client.isReady) continue;

      client.update(dt);
      for (const message of client.messages) {
        this.game.processClientMessage(client, message);
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
      client.send(payload);
    }

    this.game.endTick();
    this.clients.forEach(client => client.cleanup());

    // calculate top entity types
    // const topEntityTypes = new Map();
    // for (const entity of this.game.entities) {
    //   if (entity.removed) continue;
    //   if (!topEntityTypes.has(entity.type)) {
    //     topEntityTypes.set(entity.type, 0);
    //   }
    //   topEntityTypes.set(entity.type, topEntityTypes.get(entity.type) + 1);
    // }
    // console.log('top 5 entity types by count:', [...topEntityTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5), 'total:', this.game.entities.size);
  }
}

module.exports = Server;