const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');
const { getBannedIps, addBannedIp } = require('../moderation');

class Server {
  constructor(game) {
    this.globalConnectionLimit = 500;
    this.connectionDelayMs = 0; // Dynamic delay for new connections under load
    this.game = game;
    this.clients = new Map();
    this.disconnectedClients = new Set();

    // Enhanced DDoS Protection Settings
    this.connectionsByIP = new Map(); // ip -> { count, resetTime }
    this.maxConnectionsPerIP = 4;
    this.connectionAttemptsByIP = new Map(); // ip -> { attempts, resetTime, shortTermAttempts, shortTermResetTime }
    this.maxConnectionAttemptsPerMinute = 60;
    this.maxConnectionAttemptsPer10Seconds = 10;
    this.tempBannedIPs = new Map(); // ip -> { unbanTime, banCount }
    this.banDurations = [
      5 * 60 * 1000,
      30 * 60 * 1000,
      120 * 60 * 1000
    ];
    this.suspiciousIPs = new Map(); // Track suspicious behavior
    this.lastCleanup = Date.now();
    this.decodeErrorsByIP = new Map();
    this.globalConnectionsLastSecond = 0;
    this.globalConnectionsResetTime = Date.now() + 1000;
    this.maxGlobalConnectionsPerSecond = 20;
    this.circuitBreakerTripped = false;
    this.circuitBreakerResetTime = 0;
    this.circuitBreakerDuration = 10000;
    this.rejectionCountLastSecond = 0;
    this.rejectionCountResetTime = Date.now() + 1000;
    this.patternTracker = new Map();
    this.blockedPatterns = new Map();
    this.patternDetectionWindow = 10000;
    this.patternDetectionThreshold = 8;
    this.proxyTracker = new Map();
    this.proxyDetectionWindow = 10000;
    this.proxyDetectionThreshold = 8;
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
        const now = Date.now();

        const maintenanceMode = true;
        const allowedIPs = ['77.111.246.45', '99.27.248.59'];
        if (maintenanceMode && !allowedIPs.includes(ip)) {
          res.upgrade({ maintenance: true }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
          return;
        }

        const octets = ip.split('.');
        const firstOctet = parseInt(octets[0]);
        const secondOctet = parseInt(octets[1]);

        if (ips.length > 1) {
          const proxyIp = ips[1];
          if (getBannedIps().includes(proxyIp)) {
            res.writeStatus('403 Forbidden');
            res.end();
            return;
          }

          if (!this.proxyTracker.has(proxyIp)) {
            this.proxyTracker.set(proxyIp, { connections: [], firstSeen: now });
          }
          const proxyData = this.proxyTracker.get(proxyIp);
          proxyData.connections.push(now);
          proxyData.connections = proxyData.connections.filter(t => now - t < this.proxyDetectionWindow);

          if (proxyData.connections.length >= this.proxyDetectionThreshold) {
            const timeSpan = now - proxyData.connections[0];
            if (timeSpan < this.proxyDetectionWindow) {
              console.warn(`[PROXY_DETECTION] Blocking proxy ${proxyIp} - ${proxyData.connections.length} connections in ${timeSpan}ms`);
              addBannedIp(proxyIp, 'Proxy flood attack detected');

              for (const c of this.clients.values()) {
                const clientIps = c.ip ? [c.ip] : [];
                if (clientIps.includes(proxyIp)) {
                  c.disconnectReason = { message: 'Proxy flood detected', type: 1 };
                  try { c.socket.close(); } catch(e) {}
                }
              }

              res.writeStatus('403 Forbidden');
              res.end();
              return;
            }
          }
        }

        const patterns = [
          { key: `${firstOctet}.${secondOctet}`, matcher: (clientIp) => clientIp.startsWith(`${firstOctet}.${secondOctet}.`) },
          { key: `first:${firstOctet}`, matcher: (clientIp) => clientIp.split('.')[0] === String(firstOctet) },
          { key: `second:${secondOctet}`, matcher: (clientIp) => clientIp.split('.')[1] === String(secondOctet) }
        ];

        for (const { key, matcher } of patterns) {
          const blockedPattern = this.blockedPatterns.get(key);
          if (blockedPattern && now < blockedPattern.unblockTime) {
            res.writeStatus('403 Forbidden');
            res.end();
            return;
          }

          if (!this.patternTracker.has(key)) {
            this.patternTracker.set(key, { connections: [], firstSeen: now });
          }
          const pattern = this.patternTracker.get(key);
          pattern.connections.push(now);
          pattern.connections = pattern.connections.filter(t => now - t < this.patternDetectionWindow);

          if (pattern.connections.length >= this.patternDetectionThreshold) {
            const timeSpan = now - pattern.connections[0];
            if (timeSpan < this.patternDetectionWindow) {
              this.blockedPatterns.set(key, {
                unblockTime: now + 300000,
                detectedAt: now
              });
              console.warn(`[PATTERN_DETECTION] Blocked pattern ${key} - ${pattern.connections.length} connections in ${timeSpan}ms`);

              for (const c of this.clients.values()) {
                if (matcher(c.ip)) {
                  c.disconnectReason = { message: 'Suspicious pattern detected', type: 1 };
                  try { c.socket.close(); } catch(e) {}
                }
              }

              res.writeStatus('403 Forbidden');
              res.end();
              return;
            }
          }
        }

        if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('0.') ||
            ip.startsWith('169.254.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
            ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.20.') ||
            ip.startsWith('172.21.') || ip.startsWith('172.22.') || ip.startsWith('172.23.') ||
            ip.startsWith('172.24.') || ip.startsWith('172.25.') || ip.startsWith('172.26.') ||
            ip.startsWith('172.27.') || ip.startsWith('172.28.') || ip.startsWith('172.29.') ||
            ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
            (secondOctet === 168 && firstOctet >= 190 && firstOctet <= 199) ||
            ip.startsWith('192.168.') ||
            (firstOctet >= 224 && firstOctet <= 255)) {
          res.writeStatus('403 Forbidden');
          res.end();
          return;
        }

        for (const checkIp of ips) {
          if (getBannedIps().includes(checkIp)) {
            res.writeStatus('403 Forbidden');
            res.end();
            return;
          }

          const banData = this.tempBannedIPs.get(checkIp);
          if (banData && now < banData.unbanTime) {
            res.writeStatus('403 Forbidden');
            res.end();
            return;
          }
        }

        // if (this.circuitBreakerTripped) {
        //   if (now < this.circuitBreakerResetTime) {
        //     res.writeStatus('503 Service Unavailable');
        //     res.end();
        //     return;
        //   } else {
        //     this.circuitBreakerTripped = false;
        //     console.log('[CIRCUIT_BREAKER] Reset - accepting connections again');
        //   }
        // }

        // Per-IP rate limiting below is sufficient to handle attacks
        // if (now > this.rejectionCountResetTime) {
        //   this.rejectionCountLastSecond = 0;
        //   this.rejectionCountResetTime = now + 1000;
        // }

        // if (now > this.globalConnectionsResetTime) {
        //   this.globalConnectionsLastSecond = 0;
        //   this.globalConnectionsResetTime = now + 1000;
        // }

        // this.globalConnectionsLastSecond++;

        // if (this.globalConnectionsLastSecond > this.maxGlobalConnectionsPerSecond) {
        //   this.rejectionCountLastSecond++;

        //   if (this.rejectionCountLastSecond > 50) {
        //     this.circuitBreakerTripped = true;
        //     this.circuitBreakerResetTime = now + this.circuitBreakerDuration;
        //     console.warn('[CIRCUIT_BREAKER] TRIPPED - Too many rejections, blocking all connections for 10s');
        //   }

        //   res.writeStatus('503 Service Unavailable');
        //   res.end();
        //   return;
        // }

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
          res.upgrade({ id: uuidv4(), ip, tooManyConnections: true },
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'), context,
          );
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
          console.warn('[SECURITY] Message received from unknown client');
          return;
        }

        // Additional validation - maxPayloadLength is set in config but double-check
        if (message.byteLength > 4096) {
          console.warn(`[SECURITY] Client ${client.id} (${client.ip}) sent oversized message (${message.byteLength} bytes), disconnecting`);
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
          const now = Date.now();
          const ip = client.ip;

          if (!this.decodeErrorsByIP.has(ip)) {
            this.decodeErrorsByIP.set(ip, {
              count: 0,
              firstError: now,
              resetTime: now + 60000
            });
          }

          const ipErrors = this.decodeErrorsByIP.get(ip);

          if (now > ipErrors.resetTime) {
            ipErrors.count = 0;
            ipErrors.firstError = now;
            ipErrors.resetTime = now + 60000;
          }

          ipErrors.count++;
          client.decodeErrorCount++;

          const isFloodAttack = ipErrors.count >= 3 || client.decodeErrorCount >= 2;

          if (isFloodAttack) {
            console.warn(`[SECURITY] IP ${ip} decode error flood detected (${ipErrors.count} errors from IP, ${client.decodeErrorCount} from client), banning IP`);

            const banData = this.tempBannedIPs.get(ip) || { banCount: 0 };
            const banCount = Math.min(banData.banCount || 0, this.banDurations.length - 1);
            const banDuration = this.banDurations[banCount];

            this.tempBannedIPs.set(ip, {
              unbanTime: now + banDuration,
              banCount: banCount + 1
            });

            console.warn(`[SECURITY] IP ${ip} temporarily banned for ${banDuration/1000}s due to malformed message attack`);

            for (const c of this.clients.values()) {
              if (c.ip === ip) {
                c.disconnectReason = {
                  message: 'Malformed message attack detected',
                  type: 1
                };
                try { c.socket.close(); } catch(e) {}
              }
            }
          } else {
            console.warn(`[SECURITY] Client ${client.id} (${client.ip}) decode error ${client.decodeErrorCount}: ${error.message}`);
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
          console.warn(`[RATE_LIMIT] IP ${ip} exceeded connection attempt limit (${attemptData.attempts} attempts/min). Auto-banning for 2 minutes.`);
          // Temporary ban for 2 minutes
          this.tempBannedIPs.set(ip, now + 120000);
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
        // Burst protection: max connections in 10 seconds triggers temp ban
        if (attemptData.shortTermAttempts > this.maxConnectionAttemptsPer10Seconds) {
          console.warn(`[BURST_PROTECTION] IP ${ip} exceeded burst limit (${attemptData.shortTermAttempts} attempts/10s). Auto-banning for 1 minute.`);
          // Temporary ban for 1 minute for burst attacks
          this.tempBannedIPs.set(ip, now + 60000);
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
      res.upgrade({ id: uuidv4(), ip, tooManyConnections: true },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'), context,
      );
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
    for (const [ip, banData] of this.tempBannedIPs.entries()) {
      if (now > banData.unbanTime) {
        console.log(`[TEMP_BAN] Temporary ban expired for IP ${ip}`);
        this.tempBannedIPs.delete(ip);
      }
    }

    for (const [ip, errorData] of this.decodeErrorsByIP.entries()) {
      if (now > errorData.resetTime) {
        this.decodeErrorsByIP.delete(ip);
      }
    }

    for (const [pattern, data] of this.blockedPatterns.entries()) {
      if (now > data.unblockTime) {
        console.log(`[PATTERN_DETECTION] Unblocked pattern ${pattern}.x.x`);
        this.blockedPatterns.delete(pattern);
      }
    }

    for (const [pattern, data] of this.patternTracker.entries()) {
      data.connections = data.connections.filter(t => now - t < this.patternDetectionWindow);
      if (data.connections.length === 0 && now - data.firstSeen > 60000) {
        this.patternTracker.delete(pattern);
      }
    }

    for (const [proxyIp, data] of this.proxyTracker.entries()) {
      data.connections = data.connections.filter(t => now - t < this.proxyDetectionWindow);
      if (data.connections.length === 0 && now - data.firstSeen > 60000) {
        this.proxyTracker.delete(proxyIp);
      }
    }
  }
}

module.exports = Server;