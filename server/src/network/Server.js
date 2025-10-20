const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');
const { getBannedIps, addBannedIp } = require('../moderation');

class Server {
  constructor(game) {
    this.game = game;
    this.clients = new Map();
    this.disconnectedClients = new Set();

    // Connection rate limiting per IP
    this.connectionsByIP = new Map(); // ip -> { count, resetTime }
    this.maxConnectionsPerIP = 10; // Max 10 concurrent connections per IP
    this.connectionAttemptsByIP = new Map(); // ip -> { attempts, resetTime }
    this.maxConnectionAttemptsPerMinute = 30; // Max 30 connection attempts per minute per IP
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
        const ip = client.ip;

        // Check if IP is banned
        if (getBannedIps().includes(ip)) {
          client.socket.close();
          console.log(`[BAN] Client ${client.id} (${ip}) tried to connect but is banned.`);
          return;
        }

        // Check connection attempts rate limit
        const now = Date.now();
        if (!this.connectionAttemptsByIP.has(ip)) {
          this.connectionAttemptsByIP.set(ip, { attempts: 1, resetTime: now + 60000 });
        } else {
          const attemptData = this.connectionAttemptsByIP.get(ip);
          if (now > attemptData.resetTime) {
            attemptData.attempts = 1;
            attemptData.resetTime = now + 60000;
          } else {
            attemptData.attempts++;
            if (attemptData.attempts > this.maxConnectionAttemptsPerMinute) {
              console.warn(`[RATE_LIMIT] IP ${ip} exceeded connection attempt limit (${attemptData.attempts} attempts/min)`);
              client.socket.close();
              return;
            }
          }
        }

        // Count current connections from this IP
        let connectionsFromIP = 0;
        for (const existingClient of this.clients.values()) {
          if (existingClient.ip === ip) {
            connectionsFromIP++;
          }
        }

        // Check concurrent connection limit per IP
        if (connectionsFromIP >= this.maxConnectionsPerIP) {
          console.warn(`[RATE_LIMIT] IP ${ip} exceeded concurrent connection limit (${connectionsFromIP} connections)`);
          client.socket.close();
          return;
        }

        this.addClient(client);
      },
      message: (socket, message) => {
        const client = this.clients.get(socket.id);
        if (!client) {
          console.warn('[SECURITY] Message received from unknown client');
          return;
        }

        // Additional validation - maxPayloadLength is set in config but double-check
        if (message.byteLength > 2048) {
          console.warn(`[SECURITY] Client ${client.id} (${client.ip}) sent oversized message (${message.byteLength} bytes), banning`);

          // Ban the IP address immediately for attempting to bypass max payload
          addBannedIp(client.ip, `Oversized message attack (${message.byteLength} bytes)`);

          client.decodeErrorCount = client.maxDecodeErrors; // Instant disconnect
          client.disconnectReason = {
            message: 'Oversized message',
            type: 1
          };
          client.socket.close();
          return;
        }

        try {
          const data = Protocol.decode(message);
          if (data) {
            client.addMessage(data);
          }
        } catch (error) {
          // Track decode errors per client
          client.decodeErrorCount++;

          // Log first error with details, then reduce verbosity
          if (client.decodeErrorCount === 1) {
            console.warn(`[SECURITY] Client ${client.id} (${client.ip}) decode error: ${error.message}`);
          } else if (client.decodeErrorCount <= 3) {
            console.warn(`[SECURITY] Client ${client.id} (${client.ip}) decode error #${client.decodeErrorCount}`);
          }

          // Disconnect and ban after too many errors
          if (client.decodeErrorCount >= client.maxDecodeErrors) {
            console.warn(`[SECURITY] Client ${client.id} (${client.ip}) exceeded decode error limit (${client.decodeErrorCount}), disconnecting and banning`);

            // Ban the IP address
            addBannedIp(client.ip, 'Too many malformed protobuf messages');

            client.disconnectReason = {
              message: 'Too many malformed messages',
              type: 1
            };
            try {
              client.socket.close();
            } catch(e) {
              console.error('Error closing socket:', e);
            }
          }
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

    // Cleanup expired rate limit tracking data every 60 seconds (3600 ticks at 60 TPS)
    if (!this.rateLimitCleanupTimer) this.rateLimitCleanupTimer = 0;
    this.rateLimitCleanupTimer++;
    if (this.rateLimitCleanupTimer >= 3600) {
      this.cleanupRateLimitTracking();
      this.rateLimitCleanupTimer = 0;
    }

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

  cleanupRateLimitTracking() {
    const now = Date.now();

    // Clean up expired connection attempt tracking
    for (const [ip, data] of this.connectionAttemptsByIP.entries()) {
      if (now > data.resetTime) {
        this.connectionAttemptsByIP.delete(ip);
      }
    }
  }
}

module.exports = Server;