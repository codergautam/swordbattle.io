const config = require('../config');
const Account = require('./Account');
const api = require('./api');

class Client {
  constructor(socket, token) {
    this.socket = socket;
    this.id = socket.id;
    this.token = token;

    this.server = null;
    this.player = null;
    this.account = null;
    this.isReady = false;
    this.isSocketClosed = false;

    this.messages = [];
    this.pingTimer = 0;
    this.disconnectReason = 'Server';

    this.getAccount();
  }

  addMessage(message) {
    this.messages.push(message);
  }

  update() {
    if (this.isSocketClosed) return;

    this.pingTimer -= 1;
    if (this.pingTimer <= 0) {
      this.socket.ping();
      this.pingTimer = 900;
    }
  }

  getAccount() {
    if (!this.token) {
      this.isReady = true;
      return;
    }

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
    if (!this.shouldSaveGame(game)) return;

    game.account_id = this.account.id;

    api.post('/games/save', game, (data) => {
      if (data.message) {
        console.warn('Failed to save game:', game, data.message);
      }
    });
  }
}

module.exports = Client;
