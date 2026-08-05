import { Events } from 'discord.js';
import { config } from '../../config.js';
import { createLogger } from '../../lib/log.js';
import { loadState, saveState } from '../../lib/state.js';
import { createBotClient } from '../../lib/discord.js';
import { createPoller } from './poller.js';
import { createAnnouncer } from './announcer.js';
import { registerCommands, handleInteraction } from './commands/index.js';

const log = createLogger('leaderboard');

export async function start(token) {
  const client = await createBotClient(token, log);
  const channel = await client.channels.fetch(config.leaderboard.channelId);
  if (!channel || !channel.isTextBased()) throw new Error('leaderboard channel not found or not text-based');
  await registerCommands(client, channel.guildId);
  const poller = createPoller();
  const announcer = createAnnouncer({
    getBoard: poller.getBoard,
    sendMessage: async (payload) => {
      if (config.dryRun) {
        log.info('dryRun announce:', JSON.stringify(payload).slice(0, 4000));
        return;
      }
      await channel.send(payload);
    },
    loadState,
    saveState,
    log,
    cfg: { roleId: config.leaderboard.roleId, flushMinutes: config.leaderboard.flushMinutes },
  });
  client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, { poller, log }));
  poller.start(announcer);
  return {
    name: 'leaderboard',
    client,
    stop: async () => {
      poller.stop();
      await client.destroy();
    },
  };
}
