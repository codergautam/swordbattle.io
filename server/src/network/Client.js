const Account = require('./Account');
const Spectator = require('../game/Spectator');
const config = require('../config');
const api = require('./api');

class Client {
  constructor(game, socket) {
    this.game = game;
    this.socket = socket;
    this.id = socket.id;
    this.token = '';

    this.spectator = new Spectator(this.game, this);
    this.server = null;
    this.player = null;
    this.account = null;
    this.isReady = true;
    this.isSocketClosed = false;
    this.fullSync = false;

    this.messages = [];
    this.pingTimer = 0;
    this.pong = false;
    this.disconnectReason = '';
  }

  addMessage(message) {
    if (message.token && message.token !== this.token) {
      this.token = message.token;
      this.getAccount();
    } else {
      this.messages.push(message);
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
    api.post('/auth/verify', { token: this.token }, (data) => {
      if (data.account) {
        this.account = new Account();
        this.account.update(data.account);
      }
      this.isReady = true;
    });
  }

  shouldSaveGame(game) {
    return game.playtime >= config.saveGame.playtime * 60
      || game.kills >= config.saveGame.kills
      || game.coins >= config.saveGame.coins;
  }

  saveGame(game) {
    if (!this.account) return;

    game.account_id = this.account.id;

    api.post('/stats/update', game, (data) => {
      if (data.message) {
        console.warn('Failed to save stats:', game, data.message);
      }
    });

    if (this.shouldSaveGame(game)) {
      api.post('/games/save', game, (data) => {
        if (data.message) {
          console.warn('Failed to save game:', game, data.message);
        }
      });
    }
  }
}

module.exports = Client;
