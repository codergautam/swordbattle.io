const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');
const { getBannedIps, addBannedIp } = require('../moderation');

class Server {
  constructor(game) {
    this.globalConnectionLimit = 400; // Higher max open connections
    this.connectionDelayMs = 0; // Dynamic delay for new connections under load
    this.game = game;
    this.clients = new Map();
    this.disconnectedClients = new Set();

    // Enhanced DDoS Protection Settings
    this.connectionsByIP = new Map(); // ip -> { count, resetTime }
    this.maxConnectionsPerIP = 10; 
    this.connectionAttemptsByIP = new Map(); // ip -> { attempts, resetTime, shortTermAttempts, shortTermResetTime }
    this.maxConnectionAttemptsPerMinute = 20; 
    this.maxConnectionAttemptsPer10Seconds = 4;
    this.tempBannedIPs = new Map(); // ip -> { unbanTime, banCount }
    this.banDurations = [
      5 * 60 * 1000,    // 5 minutes for first offense
      30 * 60 * 1000,   // 30 minutes for second offense
      24 * 60 * 60 * 1000 // 24 hours for third+ offense
    ];
    this.suspiciousIPs = new Map(); // Track suspicious behavior
    this.lastCleanup = Date.now();
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
        const ip = req.getHeader('x-forwarded-for') || req.getHeader('cf-connecting-ip') || '';
        const now = Date.now();

        // Check if IP is banned
        const banData = this.tempBannedIPs.get(ip);
        if (banData && now < banData.unbanTime) {
          res.writeStatus('403 Forbidden');
          res.end('Access denied');
          return;
        }

        // Check for rate limiting
        const attempts = this.connectionAttemptsByIP.get(ip) || { 
          attempts: 0, 
          resetTime: now + 60000,
          shortTermAttempts: 0,
          shortTermResetTime: now + 10000
        };

        // Reset counters if time window expired
        if (now > attempts.resetTime) {
          attempts.attempts = 0;
          attempts.resetTime = now + 60000;
        }
        if (now > attempts.shortTermResetTime) {
          attempts.shortTermAttempts = 0;
          attempts.shortTermResetTime = now + 10000;
        }

        // Increment attempt counters
        attempts.attempts++;
        attempts.shortTermAttempts++;
        this.connectionAttemptsByIP.set(ip, attempts);

        // Check rate limits
        if (attempts.attempts > this.maxConnectionAttemptsPerMinute || 
            attempts.shortTermAttempts > this.maxConnectionAttemptsPer10Seconds) {
          // Apply progressive ban
          const prevBan = this.tempBannedIPs.get(ip) || { banCount: 0 };
          const banCount = Math.min(prevBan.banCount || 0, this.banDurations.length - 1);
          const banDuration = this.banDurations[banCount];
          
          this.tempBannedIPs.set(ip, {
            unbanTime: now + banDuration,
            banCount: banCount + 1
          });
          
          console.warn(`[RATE_LIMIT] IP ${ip} banned for ${banDuration/1000}s (violation: ${attempts.attempts} attempts/min, ${attempts.shortTermAttempts} attempts/10s)`);
          res.writeStatus('429 Too Many Requests');
          res.end('Too many connection attempts');
          return;
        }

        // Check current connections from this IP
        const currentConnections = Array.from(this.clients.values())
          .filter(client => client.ip === ip).length;
        
        if (currentConnections >= this.maxConnectionsPerIP) {
          console.warn(`[CONN_LIMIT] IP ${ip} exceeded max connections (${currentConnections}/${this.maxConnectionsPerIP})`);
          res.writeStatus('429 Too Many Requests');
          res.end('Too many connections from your IP');
          return;
        }

        // GLOBAL CONNECTION LIMIT
        const totalConnections = this.clients.size;
        if (totalConnections >= this.globalConnectionLimit) {
          console.warn(`[GLOBAL_LIMIT] Too many open connections (${totalConnections}), rejecting new connection.`);
          res.writeStatus('503 Service Unavailable');
          res.end('Server overloaded');
          return;
        }

        // Dynamic delay under load
        if (totalConnections > this.globalConnectionLimit * 0.8) {
          const delay = Math.floor(Math.random() * 300) + 100; // 100-400ms
          setTimeout(() => this._handleUpgrade(res, req, context, ip, now), delay);
          return;
        }

        this._handleUpgrade(res, req, context, ip, now);
      },
      open: (socket) => {
        const client = new Client(this.game, socket);
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
          console.warn(`[SECURITY] Client ${client.id} (${client.ip}) sent oversized message (${message.byteLength} bytes), temp-banning`);
          // Temp-ban the IP for 10 minutes
          this.tempBannedIPs.set(client.ip, Date.now() + 10 * 60 * 1000);
          addBannedIp(client.ip, `Oversized message attack (${message.byteLength} bytes)`);
          client.disconnectReason = {
            message: 'Oversized message',
            type: 1
          };
          try { client.socket.close(); } catch(e) {}
          return;
        }

        try {
          const data = Protocol.decode(message);
          if (data) {
            client.addMessage(data);
          }
        } catch (error) {
          // On any decode error, temp-ban and disconnect immediately
          console.warn(`[SECURITY] Client ${client.id} (${client.ip}) decode error: ${error.message} (instant temp-ban)`);
          this.tempBannedIPs.set(client.ip, Date.now() + 10 * 60 * 1000);
          addBannedIp(client.ip, 'Malformed protobuf message (instant temp-ban)');
          client.disconnectReason = {
            message: 'Malformed protobuf',
            type: 1
          };
          try { client.socket.close(); } catch(e) {}
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

  _handleUpgrade(res, req, context, ip, now) {
    // CRITICAL: Check if IP is banned BEFORE accepting connection
    if (getBannedIps().includes(ip)) {
      console.log(`[BAN] IP ${ip} tried to upgrade WebSocket but is banned. Rejecting connection.`);
      res.writeStatus('403 Forbidden');
      res.end('Banned');
      return;
    }

    // Check temporary auto-ban (for flood attackers)
    if (this.tempBannedIPs.has(ip)) {
      const unbanTime = this.tempBannedIPs.get(ip);
      if (now < unbanTime) {
        const remainingSeconds = Math.ceil((unbanTime - now) / 1000);
        console.warn(`[TEMP_BAN] IP ${ip} is temporarily banned. ${remainingSeconds}s remaining.`);
        res.writeStatus('403 Forbidden');
        res.end('Temporarily banned for suspicious activity');
        return;
      } else {
        // Ban expired, remove it
        this.tempBannedIPs.delete(ip);
      }
    }

    // Enhanced connection attempts rate limiting with burst protection
    if (!this.connectionAttemptsByIP.has(ip)) {
      this.connectionAttemptsByIP.set(ip, {
        attempts: 1,
        resetTime: now + 60000,
        shortTermAttempts: 1,
        shortTermResetTime: now + 10000
      });
    } else {
      const attemptData = this.connectionAttemptsByIP.get(ip);

      // Reset 1-minute counter if expired
      if (now > attemptData.resetTime) {
        attemptData.attempts = 1;
        attemptData.resetTime = now + 60000;
      } else {
        attemptData.attempts++;
        if (attemptData.attempts > this.maxConnectionAttemptsPerMinute) {
          console.warn(`[RATE_LIMIT] IP ${ip} exceeded connection attempt limit (${attemptData.attempts} attempts/min). Auto-banning for 1 minute.`);
          // Temporary ban for 1 minute
          this.tempBannedIPs.set(ip, now + 60000);
          res.writeStatus('429 Too Many Requests');
          res.end('Rate limit exceeded - temporarily banned');
          return;
        }
      }

      // Reset 10-second counter if expired
      if (now > attemptData.shortTermResetTime) {
        attemptData.shortTermAttempts = 1;
        attemptData.shortTermResetTime = now + 10000;
      } else {
        attemptData.shortTermAttempts++;
        // Burst protection: 7 connections in 10 seconds triggers temp ban
        if (attemptData.shortTermAttempts > this.maxConnectionAttemptsPer10Seconds) {
          console.warn(`[BURST_PROTECTION] IP ${ip} exceeded burst limit (${attemptData.shortTermAttempts} attempts/10s). Auto-banning for 2 minutes.`);
          // Temporary ban for 2 minutes for burst attacks
          this.tempBannedIPs.set(ip, now + 120000);
          res.writeStatus('429 Too Many Requests');
          res.end('Burst rate limit exceeded - temporarily banned');
          return;
        }
      }
    }

    // Count current connections from this IP BEFORE accepting
    let connectionsFromIP = 0;
    for (const existingClient of this.clients.values()) {
      if (existingClient.ip === ip) {
        connectionsFromIP++;
      }
    }

    // Check concurrent connection limit per IP BEFORE accepting
    if (connectionsFromIP >= this.maxConnectionsPerIP) {
      console.warn(`[RATE_LIMIT] IP ${ip} exceeded concurrent connection limit (${connectionsFromIP} connections). Rejecting connection.`);
      res.writeStatus('429 Too Many Requests');
      res.end('Too many connections');
      return;
    }

    // Only upgrade if all checks pass
    res.upgrade({ id: uuidv4(), ip },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'), context,
    );
  }

  // Proper class method
  _handleUpgrade(res, req, context, ip, now) {
    // CRITICAL: Check if IP is banned BEFORE accepting connection
    if (getBannedIps().includes(ip)) {
      console.log(`[BAN] IP ${ip} tried to upgrade WebSocket but is banned. Rejecting connection.`);
      res.writeStatus('403 Forbidden');
      res.end('Banned');
      return;
    }

    // Check temporary auto-ban (for flood attackers)
    if (this.tempBannedIPs.has(ip)) {
      const unbanTime = this.tempBannedIPs.get(ip);
      if (now < unbanTime) {
        const remainingSeconds = Math.ceil((unbanTime - now) / 1000);
        console.warn(`[TEMP_BAN] IP ${ip} is temporarily banned. ${remainingSeconds}s remaining.`);
        res.writeStatus('403 Forbidden');
        res.end('Temporarily banned for suspicious activity');
        return;
      } else {
        // Ban expired, remove it
        this.tempBannedIPs.delete(ip);
      }
    }

    // Enhanced connection attempts rate limiting with burst protection
    if (!this.connectionAttemptsByIP.has(ip)) {
      this.connectionAttemptsByIP.set(ip, {
        attempts: 1,
        resetTime: now + 60000,
        shortTermAttempts: 1,
        shortTermResetTime: now + 10000
      });
    } else {
      const attemptData = this.connectionAttemptsByIP.get(ip);

      // Reset 1-minute counter if expired
      if (now > attemptData.resetTime) {
        attemptData.attempts = 1;
        attemptData.resetTime = now + 60000;
      } else {
        attemptData.attempts++;
        if (attemptData.attempts > this.maxConnectionAttemptsPerMinute) {
          console.warn(`[RATE_LIMIT] IP ${ip} exceeded connection attempt limit (${attemptData.attempts} attempts/min). Auto-banning for 5 minutes.`);
          // Temporary ban for 5 minutes
          this.tempBannedIPs.set(ip, now + 300000);
          res.writeStatus('429 Too Many Requests');
          res.end('Rate limit exceeded - temporarily banned');
          return;
        }
      }

      // Reset 10-second counter if expired
      if (now > attemptData.shortTermResetTime) {
        attemptData.shortTermAttempts = 1;
        attemptData.shortTermResetTime = now + 10000;
      } else {
        attemptData.shortTermAttempts++;
        // Burst protection: 3 connections in 10 seconds triggers temp ban
        if (attemptData.shortTermAttempts > this.maxConnectionAttemptsPer10Seconds) {
          console.warn(`[BURST_PROTECTION] IP ${ip} exceeded burst limit (${attemptData.shortTermAttempts} attempts/10s). Auto-banning for 10 minutes.`);
          // Temporary ban for 10 minutes for burst attacks
          this.tempBannedIPs.set(ip, now + 600000);
          res.writeStatus('429 Too Many Requests');
          res.end('Burst rate limit exceeded - temporarily banned');
          return;
        }
      }
    }

    // Count current connections from this IP BEFORE accepting
    let connectionsFromIP = 0;
    for (const existingClient of this.clients.values()) {
      if (existingClient.ip === ip) {
        connectionsFromIP++;
      }
    }

    // Check concurrent connection limit per IP BEFORE accepting
    if (connectionsFromIP >= this.maxConnectionsPerIP) {
      console.warn(`[RATE_LIMIT] IP ${ip} exceeded concurrent connection limit (${connectionsFromIP} connections). Rejecting connection.`);
      res.writeStatus('429 Too Many Requests');
      res.end('Too many connections');
      return;
    }

    // Only upgrade if all checks pass
    res.upgrade({ id: uuidv4(), ip },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'), context,
    );
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
      if (now > data.resetTime && now > data.shortTermResetTime) {
        this.connectionAttemptsByIP.delete(ip);
      }
    }

    // Clean up expired temporary bans
    for (const [ip, unbanTime] of this.tempBannedIPs.entries()) {
      if (now > unbanTime) {
        console.log(`[TEMP_BAN] Temporary ban expired for IP ${ip}`);
        this.tempBannedIPs.delete(ip);
      }
    }
  }
}

module.exports = Server;