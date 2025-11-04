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

    this.messages = [];
    this.pingTimer = 0;
    this.disconnectReason = {
      message: '',
      type: 0
    }

    // Rate limiting
    this.messageCount = 0;
    this.messageResetTimer = 0;
    this.maxMessagesPerSecond = 120; // 120 messages per second (2 per tick at 60 TPS)
    this.maxQueueSize = 100; // Maximum queued messages

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

    if(message.hasOwnProperty("token") && message.token === '' && this.token !== '' && this.account !== null) {
      this.token = '';
      this.account = null;
    }
    if (message.isPing) {
      this.send({ isPong: true, tps: this.game.tps });
    } else if (message.token) {
      // console.log('Client', this.id, 'authenticated with token');
      this.token = message.token;
      this.getAccount();
    } else {
      this.messages.push(message);
    }
  }

  send(data) {
    if (!data) return;
    if(data.fullSync) console.log('sending fullsync to', this.player?.name ?? 'spectator', Date.now());

    const packet = Protocol.encode(data);
    if (!this.isSocketClosed) {
      this.socket.send(packet, { binary: true, compress: true });
    }
  }

  update(dt) {
    if (this.isSocketClosed) return;

    if (this.spectator) {
      this.spectator.update(dt);
    }

    this.pingTimer -= 1;
    if (this.pingTimer <= 0) {
      this.socket.ping();
      this.pingTimer = 900;
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
    console.log('Client', this.id, 'authenticating with token POST /auth/verify');
    api.post('/auth/verify', { secret: this.token }, (data) => {
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
    const { gems, xp, mastery } = calculateGemsXP(game.coins, game.kills);
    game.gems = gems;
    game.mastery = mastery;
    game.xp = xp;

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

module.exports = Client;