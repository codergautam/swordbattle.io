const uws = require('uWebSockets.js');
const { pack, unpack } = require('msgpackr');
const { v4: uuidv4 } = require('uuid');
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
    const getCookie = (res, req, name) => {
      res.cookies ??= req.getHeader('cookie');
      return res.cookies && res.cookies.match(getCookie[name] ??= new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`))?.[2];
    };

    app.ws('/*', {
      compression: uws.SHARED_COMPRESSOR,
      idleTimeout: 32,
      upgrade:(res, req, context) => {
        res.upgrade({ id: uuidv4(), token: getCookie(res, req, 'auth-token') },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'), context,
        );
      },
      open: (socket) => {
        console.log(`Client ${socket.id} connected.`);
        const client = new Client(socket, socket.token);
        this.addClient(client);
      },
      message: (socket, message) => {
        const client = this.clients.get(socket.id);
        const payload = unpack(message);
  
        if (payload.isPing) {
          const pong = pack({ isPong: true });
          socket.send(pong, { binary: true, compress: true });
        } else {
          client.addMessage(payload);
        }
      },
      close: (socket, code) => {
        const client = this.clients.get(socket.id);
        client.isSocketClosed = true;
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

  tick(dt) {
    for (const client of this.clients.values()) {
      if (!client.isReady) continue;

      client.update();
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
      if (payload !== null && !client.isSocketClosed) {
        client.socket.send(payload, { binary: true, compress: true });
      }
    }

    this.game.endTick();
  }
}

module.exports = Server;
