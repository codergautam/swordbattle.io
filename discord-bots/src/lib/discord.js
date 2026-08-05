import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from '../config.js';

export async function createBotClient(token, log) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.on('error', (err) => log.error('client error', err));
  client.on('shardError', (err) => log.error('shard error', err));
  await client.login(token);
  if (!client.isReady()) await new Promise((resolve) => client.once(Events.ClientReady, resolve));
  return client;
}

export async function sendToChannel(client, channelId, payload, log) {
  if (config.dryRun) {
    log.info('dryRun payload:', JSON.stringify(payload).slice(0, 4000));
    return null;
  }
  const channel = await client.channels.fetch(channelId);
  return channel.send(payload);
}
