import { MessageFlags, Routes } from 'discord.js';
import * as top from './top.js';
import * as player from './player.js';
import * as topgames from './topgames.js';
import { colors } from '../../../lib/embeds.js';
import { emojis } from '../../../lib/emojis.js';

const handlers = { top, player, topgames };

export const commandDefs = [top.def, player.def, topgames.def];

export async function registerCommands(client, guildId) {
  await client.rest.put(Routes.applicationGuildCommands(client.application.id, guildId), { body: commandDefs });
}

export async function handleInteraction(interaction, ctx) {
  if (interaction.isAutocomplete()) {
    const mod = handlers[interaction.commandName];
    if (mod && mod.autocomplete) await mod.autocomplete(interaction, ctx).catch(() => {});
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const mod = handlers[interaction.commandName];
  if (!mod) return;
  try {
    await mod.run(interaction, ctx);
  } catch (err) {
    ctx.log.error(`/${interaction.commandName} failed:`, err);
    const embed = { color: colors.error, description: `${emojis.error} Something went wrong, try again in a bit.` };
    try {
      if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [embed] });
      else await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch {}
  }
}
