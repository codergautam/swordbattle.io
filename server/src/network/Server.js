const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');
const { getBannedIps } = require('../moderation');
const api = require('./api');

class Server {
  constructor(game) {
    this.globalConnectionLimit = 500;
    this.game = game;
    this.clients = new Map();
    this.disconnectedClients = new Set();
    this.maxConnectionsPerIP = 50;

    // Maintenance mode
    this.maintenanceMode = false;
    this.allowedIPs = [];
    this._refreshAllowedIPs();
    setInterval(() => this._refreshAllowedIPs(), 30000); // refresh every 30s
  }

  _refreshAllowedIPs() {
    api.get('/maintenance/allowed-ips', (data) => {
      if (data && !data.error && Array.isArray(data)) {
        this.allowedIPs = data;
      }
    });
  }

  get online() {
    return this.game.players.size;
  }

  initialize(app) {
    app.ws('/*', {
      compression: uws.SHARED_COMPRESSOR,
      idleTimeout: 60,
      maxPayloadLength: 4096,
      upgrade: (res, req, context) => {
        const forwardedFor = req.getHeader('x-forwarded-for') || req.getHeader('cf-connecting-ip') || '';
        const ips = forwardedFor.split(',').map(i => i.trim());
        const ip = ips[0];
        if (this.maintenanceMode && !this.allowedIPs.includes(ip)) {
          res.upgrade({ maintenance: true }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
          return;
        }

        for (const checkIp of ips) {
          if (getBannedIps().includes(checkIp)) {
            res.writeStatus('403 Forbidden');
            res.end();
            return;
          }
        }

        // Check current connections from this IP
        const currentConnections = Array.from(this.clients.values())
          .filter(client => client.ip === ip).length;

        if (currentConnections >= this.maxConnectionsPerIP) {
          res.upgrade({ id: uuidv4(), ip, tooManyConnections: true },
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'), context,
          );
          return;
        }

        const totalConnections = this.clients.size;
        if (totalConnections >= this.globalConnectionLimit) {
          console.warn(`[GLOBAL_LIMIT] Too many open connections (${totalConnections}), rejecting new connection.`);
          res.writeStatus('503 Service Unavailable');
          res.end('Server overloaded');
          return;
        }

        res.upgrade({ id: uuidv4(), ip },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'), context,
        );
      },
      open: (socket) => {
        if (socket.getUserData().maintenance) {
          socket.end(4503, 'Maintenance');
          return;
        }
        if (socket.getUserData().tooManyConnections) {
          socket.end(4429, 'Max connections reached');
          return;
        }
        const client = new Client(this.game, socket);
        this.addClient(client);
      },
      message: (socket, message) => {
        const client = this.clients.get(socket.id);
        if (!client) {
          return;
        }

        if (message.byteLength > 4096) {
          try { client.socket.close(); } catch(e) {}
          return;
        }

        try {
          const data = Protocol.decode(message);
          if (data) {
            client.addMessage(data);
          }
        } catch (error) {
          console.warn(`[DECODE] Client ${client.id} (${client.ip}) decode error: ${error.message}`);
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
  }
}

module.exports = Server;
