const config = require('../../config');

const MAX_COIN_GRANT = 10_000_000;

class DevelopmentAdminCommands {
  constructor(game, options = {}) {
    this.game = game;
    this.enabled = options.enabled ?? config.isDevelopment;
  }

  handleCommand(player, rawMessage) {
    if (!this.enabled || player?.isBot || typeof rawMessage !== 'string') return false;
    const parts = rawMessage.trim().split(/\s+/);
    if (parts[0]?.toLowerCase() !== '/admin') return false;

    const action = parts[1]?.toLowerCase();
    if (!action || action === 'help') {
      player.setSystemMessage('/admin outbreak | /admin coins <amount>');
      return true;
    }

    if (action === 'outbreak') {
      const summoned = this.game.worldEventDirector?.summonOutbreak();
      player.setSystemMessage(summoned
        ? 'Development outbreak summoned.'
        : 'An outbreak is already active.');
      return true;
    }

    if (action === 'coins') {
      const amount = Math.floor(Number(parts[2]));
      if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_COIN_GRANT) {
        player.setSystemMessage(`Coin amount must be 1-${MAX_COIN_GRANT}.`);
        return true;
      }
      player.levels?.addCoins(amount);
      player.setSystemMessage(`Granted ${amount} development coins.`);
      return true;
    }

    player.setSystemMessage('Unknown development admin command.');
    return true;
  }
}

DevelopmentAdminCommands.MAX_COIN_GRANT = MAX_COIN_GRANT;
module.exports = DevelopmentAdminCommands;
