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
  }

  addMessage(message) {
    if(message.hasOwnProperty("token") && message.token === '' && this.token !== '' && this.account !== null) {
      this.token = '';
      this.account = null;
    }
    if (message.isPing) {
      this.send({ isPong: true, tps: this.game.tps });
    } else if (message.token) {
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
    api.post('/auth/verify', { secret: this.token }, (data) => {
      if (data.account) {
        const username = data.account.username;
        this.account = new Account();
        api.post('/profile/getTop100Rank/' + username, {}, (rankData) => {
          if (rankData.rank) {
            data.account.rank = rankData.rank;
          }
        this.account.update(data.account);

        });
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
        if (data.account) {
          this.account = new Account();
          this.account.update(data.account);
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
    const { gems, xp } = calculateGemsXP(game.coins, game.kills);
    game.gems = gems;
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