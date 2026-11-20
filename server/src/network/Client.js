const Account = require('./Account');
const Spectator = require('../game/Spectator');
const Protocol = require('../network/protocol/Protocol');
const config = require('../config');
const api = require('./api');
const { calculateGemsXP } = require('../helpers');

class Client {
  constructor(game, socket) {
    this.game = game;
    this.socket = socket;
    this.id = socket.id;
    // make sure to work for cf as well (headers['cf-connecting-ip'])
    // this.ip = String.fromCharCode.apply(null, new Uint8Array(socket.getRemoteAddressAsText()));

    this.ip = socket.ip || String.fromCharCode.apply(null, new Uint8Array(socket.getRemoteAddressAsText()));
    this.browserSessionId = socket.browserSessionId || this.id;

    console.log(`Client ${this.id} connected from ${this.ip} at ${Date.now()}`);
    this.token = '';

    this.spectator = new Spectator(this.game, this);
    this.server = null;
    this.player = null;
    this.captchaVerified = false;
    this.account = null;
    this.isReady = true;
    this.isSocketClosed = false;
    this.fullSync = true;
    this.gameSessionLeaseId = '';
    this.gameSessionExpiresAt = 0;
    this.gameSessionNextHeartbeatAt = 0;
    this.gameSessionHeartbeatPending = false;
    this.gameSessionAcquirePending = false;
    this.gameSessionAcquireCallbacks = [];
    this.gameSessionGeneration = 0;
    this.authGeneration = 0;

    this.messages = [];
    this.pingTimer = 0;
    this.lastPongAt = Date.now();
    this.droppedPayloads = 0;
    this.disconnectReason = {
      message: '',
      type: 0
    }
    this.pendingRespawn = null;

    // Rate limiting
    this.messageCount = 0;
    this.messageResetTimer = 0;
    this.maxMessagesPerSecond = 500; 
    this.maxQueueSize = 250;

    this.lastPlayTime = 0;
    this.playCount = 0;
    this.playCooldown = 1000;
    this.maxPlaysPerMinute = 20;
    this.playCountResetTime = Date.now() + 60000;
    // Malformed message tracking
    this.decodeErrorCount = 0;
    this.maxDecodeErrors = 2;
    this.decodeErrorResetTimer = 0;
  }

  addMessage(message) {
    // Rate limiting check
    this.messageCount++;
    if (this.messageCount > this.maxMessagesPerSecond) {
      console.warn(`[RATE_LIMIT] Client ${this.id} (${this.ip}) exceeded message rate limit (${this.messageCount}/s)`);
      this.disconnectReason = {
        message: 'Rate limit exceeded',
        type: 1
      };
      try {
        this.socket.close();
      } catch(e) {
        console.error('Error closing socket:', e);
      }
      return;
    }

    // Queue size check
    if (this.messages.length >= this.maxQueueSize) {
      console.warn(`[RATE_LIMIT] Client ${this.id} (${this.ip}) exceeded queue size limit (${this.messages.length})`);
      this.disconnectReason = {
        message: 'Message queue overflow',
        type: 1
      };
      try {
        this.socket.close();
      } catch(e) {
        console.error('Error closing socket:', e);
      }
      return;
    }

    if(message.hasOwnProperty("token") && message.token === '' && this.token !== '') {
      this.releaseGameSession();
      this.authGeneration++;
      this.token = '';
      this.account = null;
    }
    if (message.isPing) {
      let realPlayersCnt = 0;
      for (const p of this.game.players.values()) {
        if (!p.isBot) realPlayersCnt++;
      }
      this.send({ isPong: true, tps: this.game.tps, realPlayersCnt });
    } else if (message.token) {
      // console.log('Client', this.id, 'authenticated with token');
      if (message.token === this.token && this.account) return;
      if (message.token !== this.token) this.releaseGameSession();
      this.token = message.token;
      this.getAccount();
    } else {
      this.messages.push(message);
    }
  }

  send(data) {
    if (!data) return;
    const packet = Protocol.encode(data);
    if (!this.isSocketClosed) {
      const result = this.socket.send(packet, true, true);
      if (result === 2) {
        this.droppedPayloads = (this.droppedPayloads || 0) + 1;
        if (this.droppedPayloads % 100 === 0) {
          console.warn(`[SEND] client ${this.id} (${this.ip}) has dropped ${this.droppedPayloads} payloads (slow connection)`);
        }
      } else {
        this.droppedPayloads = 0;
      }
    }
  }

  update(dt) {
    if (this.isSocketClosed) return;

    if (this.spectator) {
      this.spectator.update(dt);
    }

    this.updateGameSessionLease();

    this.pingTimer -= 1;
    if (this.pingTimer <= 0) {
      try { this.socket.ping(); } catch (e) {}
      this.pingTimer = Client.pingIntervalTicks;
      const now = Date.now();
      if (!this.lastPongAt) this.lastPongAt = now;
      if (now - this.lastPongAt > Client.pongTimeoutMs) {
        console.log(`[PING] client ${this.id} (${this.ip}) unresponsive for ${Math.round((now - this.lastPongAt) / 1000)}s, closing`);
        try { this.socket.close(); } catch (e) {}
        return;
      }
    }

    // Reset rate limit counter every second (60 ticks at 60 TPS)
    this.messageResetTimer += 1;
    if (this.messageResetTimer >= 60) {
      this.messageCount = 0;
      this.messageResetTimer = 0;
    }

    // Reset decode error counter every 10 seconds (600 ticks at 60 TPS)
    this.decodeErrorResetTimer += 1;
    if (this.decodeErrorResetTimer >= 600) {
      this.decodeErrorCount = 0;
      this.decodeErrorResetTimer = 0;
    }
  }

  cleanup() {
    if (this.spectator) {
      this.spectator.cleanup();
    }
  }

  getAccount() {
    if (!this.token) {
      this.isReady = true;
      return;
    }

    this.isReady = false;
    const token = this.token;
    const generation = ++this.authGeneration;
    console.log('Client', this.id, 'authenticating with token POST /auth/verify');
    api.post('/auth/verify', { secret: token }, (data) => {
      if (generation !== this.authGeneration || token !== this.token || this.isSocketClosed) return;
      if (data && data.error) {
        console.warn(`Client ${this.id} authentication failed: ${data.message} (status: ${data.status || 'unknown'})`);
        this.token = '';
        this.account = null;
        this.isReady = true;
        return;
      }

      if (data && data.account) {
        const username = data.account.username;
        console.log('Client', this.id, 'authenticated as', username);
        this.account = new Account();
        api.post('/profile/getTop100Rank/' + username, {}, (rankData) => {
          if (rankData && rankData.rank && !rankData.error) {
            data.account.rank = rankData.rank;
          }
          this.account.update(data.account);
        });
      } else {
        console.log("Failed to authenticate - invalid response", data);
        this.token = '';
        this.account = null;
      }
      this.isReady = true;
    });
  }

  hasGameSessionLease() {
    return !!this.gameSessionLeaseId && this.gameSessionExpiresAt > Date.now();
  }

  acquireGameSession(callback = () => {}) {
    if (!this.account?.id || !this.token) {
      callback(true);
      return;
    }
    if (this.hasGameSessionLease()) {
      callback(true);
      return;
    }

    this.gameSessionAcquireCallbacks.push(callback);
    if (this.gameSessionAcquirePending) return;
    this.gameSessionAcquirePending = true;
    const generation = ++this.gameSessionGeneration;

    api.post('/auth/game-session/acquire', {
      secret: this.token,
      serverId: this.server?.instanceId,
      ownerId: this.browserSessionId,
    }, (data) => {
      if (generation !== this.gameSessionGeneration || this.isSocketClosed) return;

      this.gameSessionAcquirePending = false;
      const callbacks = this.gameSessionAcquireCallbacks;
      this.gameSessionAcquireCallbacks = [];

      if (data?.acquired && data.leaseId) {
        this.gameSessionLeaseId = data.leaseId;
        const ttlMs = Number(data.ttlMs) || Client.gameSessionTtlMs;
        this.gameSessionExpiresAt = Date.now() + ttlMs;
        this.gameSessionNextHeartbeatAt = Date.now() + Client.gameSessionHeartbeatMs;
        callbacks.forEach((done) => done(true));
        return;
      }

      callbacks.forEach((done) => done(false));
      if (data?.status === 409 || data?.code === 'GAME_SESSION_ACTIVE') {
        try { this.socket.end(4409, 'Account is already active in another game session'); } catch (e) {}
      } else {
        console.warn('[SESSION] Failed to acquire gameplay lease:', data?.message || data);
        try { this.socket.end(1013, 'Session service temporarily unavailable'); } catch (e) {}
      }
    });
  }

  updateGameSessionLease() {
    if (!this.gameSessionLeaseId || !this.account?.id || this.gameSessionHeartbeatPending) return;
    const now = Date.now();
    if (now < this.gameSessionNextHeartbeatAt) return;

    const leaseId = this.gameSessionLeaseId;
    this.gameSessionHeartbeatPending = true;
    this.gameSessionNextHeartbeatAt = now + Client.gameSessionHeartbeatMs;
    api.post('/auth/game-session/heartbeat', {
      accountId: this.account.id,
      leaseId,
      serverId: this.server?.instanceId,
    }, (data) => {
      if (leaseId !== this.gameSessionLeaseId) return;
      this.gameSessionHeartbeatPending = false;

      if (data?.active) {
        this.gameSessionExpiresAt = Date.now() + (Number(data.ttlMs) || Client.gameSessionTtlMs);
        return;
      }

      if (data?.error && Date.now() < this.gameSessionExpiresAt) {
        this.gameSessionNextHeartbeatAt = Date.now() + Client.gameSessionRetryMs;
        return;
      }

      this.gameSessionLeaseId = '';
      const code = data?.error ? 1013 : 4409;
      const reason = data?.error
        ? 'Session service temporarily unavailable'
        : 'Gameplay session was replaced';
      try { this.socket.end(code, reason); } catch (e) {}
    });
  }

  releaseGameSession() {
    const leaseId = this.gameSessionLeaseId;
    const accountId = this.account?.id;
    const serverId = this.server?.instanceId;

    this.gameSessionGeneration++;
    this.gameSessionLeaseId = '';
    this.gameSessionExpiresAt = 0;
    this.gameSessionNextHeartbeatAt = 0;
    this.gameSessionHeartbeatPending = false;
    this.gameSessionAcquirePending = false;
    const callbacks = this.gameSessionAcquireCallbacks;
    this.gameSessionAcquireCallbacks = [];
    callbacks.forEach((done) => done(false));

    if (!leaseId || !accountId) return;
    api.post('/auth/game-session/release', { accountId, leaseId, serverId });
  }

  getAccountAsync() {
    return new Promise((resolve, reject) => {
      if (!this.token) {
        resolve();
        return;
      }

      this.isReady = false;
      api.post('/auth/verify', { secret: this.token }, (data) => {
        if (data && data.error) {
          console.warn(`Client ${this.id} async authentication failed: ${data.message} (status: ${data.status || 'unknown'})`);
          this.token = '';
          this.account = null;
          this.isReady = true;
          resolve(null);
          return;
        }

        if (data && data.account) {
          this.account = new Account();
          this.account.update(data.account);
        } else {
          this.token = '';
          this.account = null;
        }
        this.isReady = true;
        resolve(this.account);
      });
    });
  }

  shouldSaveGame(game) {
    return game.playtime >= config.saveGame.playtime * 60
      || game.kills >= config.saveGame.kills
      || game.coins >= config.saveGame.coins;
  }

  saveGame(game) {
    if (!this.account || !this.account.id) return;

    game.account_id = this.account.id;
    const { gems, xp, mastery, tokens } = calculateGemsXP(game.coins, game.kills, game.tokens);
    game.gems = gems;
    game.mastery = mastery;
    game.xp = xp;
    game.tokens = tokens;

    api.post('/stats/update', game, (data) => {
      if (data.message) {
        console.warn('Failed to save stats:', game, data.message);
      } else {
        console.log('Stats saved for', game.account_id);
      }
    });

    if (this.shouldSaveGame(game)) {
      api.post('/games/save', game, (data) => {
        if (data.message) {
          console.warn('Failed to save game:', game, data.message);
        } else {
          console.log('Game saved for', game.account_id);
        }
      });
    }
  }
}

Client.pingIntervalTicks = 200;
Client.pongTimeoutMs = 45000;
Client.gameSessionHeartbeatMs = 15000;
Client.gameSessionRetryMs = 5000;
Client.gameSessionTtlMs = 45000;

module.exports = Client;
