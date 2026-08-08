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
    this.allowedSecrets = [];
    this._refreshAllowedIPs();
    this._refreshAllowedSecrets();
    setInterval(() => this._refreshAllowedIPs(), 30000); // refresh every 30s
    setInterval(() => this._refreshAllowedSecrets(), 30000);
  }

  _refreshAllowedIPs() {
    api.get('/maintenance/allowed-ips', (data) => {
      if (data && !data.error && Array.isArray(data)) {
        this.allowedIPs = data;
      }
    });
  }

  _refreshAllowedSecrets() {
    api.get('/maintenance/allowed-secrets', (data) => {
      if (data && !data.error && Array.isArray(data)) {
        this.allowedSecrets = data.filter((s) => typeof s === 'string' && s.length > 0);
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
      maxBackpressure: 1024 * 1024,
      upgrade: (res, req, context) => {
        const forwardedFor = req.getHeader('x-forwarded-for') || req.getHeader('cf-connecting-ip') || '';
        const ips = forwardedFor.split(',').map(i => i.trim());
        const ip = ips[0];
        if (this.maintenanceMode) {
          let secret = '';
          try { secret = new URLSearchParams(req.getQuery() || '').get('secret') || ''; } catch (e) { secret = ''; }
          const bypass = this.allowedIPs.includes(ip) || (secret.length > 0 && this.allowedSecrets.includes(secret));
          if (!bypass) {
            res.upgrade({ maintenance: true }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            return;
          }
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
      pong: (socket) => {
        const client = this.clients.get(socket.id);
        if (client) client.lastPongAt = Date.now();
      },
      message: (socket, message) => {
        const client = this.clients.get(socket.id);
        if (!client) {
          return;
        }
        client.lastPongAt = Date.now();

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
        const client = this.clients.get(socket.id);
        if (!client) return;
        client.isSocketClosed = true;
        try {
          if (client.player && !client.player.removed) {
            client.player.remove();
          }
        } catch (e) {
          console.error(`[CLOSE] player.remove failed for client ${client.id} (${client.ip}):`, e);
          try {
            this.game.players.delete(client.player);
            this.game.removeEntity(client.player);
          } catch (e2) {}
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

  tick(dt) {
    for (const client of this.clients.values()) {
      if (!client.isReady) continue;

      const messages = client.messages;
      client.messages = [];
      try {
        client.update(dt);
        for (const message of messages) {
          try {
            this.game.processClientMessage(client, message);
          } catch (err) {
            console.error(`[TICK] processClientMessage failed for client ${client.id} (${client.ip}):`, err);
          }
        }
      } catch (err) {
        console.error(`[TICK] client.update failed for client ${client.id} (${client.ip}):`, err);
      }
    }

    this.game.tick(dt);

    for (const client of this.disconnectedClients) {
      this.game.removeClient(client);
      this.clients.delete(client.id);
      this.disconnectedClients.delete(client);
    }
    Protocol.beginBroadcast();
    for (const client of this.clients.values()) {
      const payload = this.game.createPayload(client);
      client.send(payload);
    }

    this.game.endTick();
    this.clients.forEach(client => client.cleanup());
  }
}

module.exports = Server;
