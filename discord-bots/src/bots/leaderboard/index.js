import { Events } from 'discord.js';
import { config } from '../../config.js';
import { createLogger } from '../../lib/log.js';
import { loadState, saveState } from '../../lib/state.js';
import { apiPost } from '../../lib/api.js';
import { getBotConfig, refreshBotConfig, startBotConfigRefresh, stopBotConfigRefresh } from '../../lib/botConfig.js';
import { createBotClient } from '../../lib/discord.js';
import { createPoller } from './poller.js';
import { createAnnouncer } from './announcer.js';
import { createDailyLeaderboard } from './daily.js';
import { createMessagePoller } from './messages.js';
import { registerCommands, handleInteraction } from './commands/index.js';

const log = createLogger('leaderboard');

async function publishEmojis(guild) {
  try {
    const collection = await guild.emojis.fetch();
    const list = collection.map((e) => ({ name: e.name, id: e.id, animated: !!e.animated }));
    await apiPost('/bots/emojis', { emojis: list }, { auth: true });
    log.info(`published ${list.length} server emojis`);
  } catch (err) {
    log.warn(`emoji publish failed: ${err.message}`);
  }
}

export async function start(token) {
  const client = await createBotClient(token, log);
  const channel = await client.channels.fetch(config.leaderboard.channelId);
  if (!channel || !channel.isTextBased()) throw new Error('leaderboard channel not found or not text-based');
  await registerCommands(client, channel.guildId);
  await refreshBotConfig();
  startBotConfigRefresh();
  publishEmojis(channel.guild);

  const sendRaw = async (payload) => {
    if (config.dryRun) {
      log.info('dryRun send:', JSON.stringify(payload).slice(0, 4000));
      return null;
    }
    return channel.send(payload);
  };

  const poller = createPoller();
  const announcer = createAnnouncer({
    getBoard: poller.getBoard,
    sendMessage: sendRaw,
    loadState,
    saveState,
    log,
    cfg: { roleId: config.leaderboard.roleId, flushMinutes: config.leaderboard.flushMinutes },
    getSettings: () => getBotConfig().leaderboard,
  });
  const daily = createDailyLeaderboard({ sendMessage: sendRaw, log });
  const messages = createMessagePoller({ sendRaw, log });

  client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, { poller, log }));
  poller.start(announcer);
  daily.start();
  messages.start();

  return {
    name: 'leaderboard',
    client,
    stop: async () => {
      poller.stop();
      daily.stop();
      messages.stop();
      stopBotConfigRefresh();
      await client.destroy();
    },
  };
}
