import { apiPost } from '../../../lib/api.js';
import { colors, discordTimestamp, escapeName, formatDuration, formatNumber, medal } from '../../../lib/embeds.js';
import { emojis } from '../../../lib/emojis.js';
import { resolvePlayer, notFoundReply, autocomplete as playerAutocomplete } from './player.js';

export const def = {
  name: 'topgames',
  description: "Show a player's best saved games",
  options: [
    { type: 3, name: 'player', description: 'Player username', required: true, autocomplete: true, max_length: 40 },
    {
      type: 3,
      name: 'category',
      description: 'Rank games by',
      required: true,
      choices: [
        { name: 'Coins', value: 'coins' },
        { name: 'Kills', value: 'kills' },
        { name: 'Survived', value: 'survived' },
      ],
    },
    {
      type: 4,
      name: 'count',
      description: 'How many games (default 10)',
      required: false,
      choices: [
        { name: '5', value: 5 },
        { name: '10', value: 10 },
        { name: '25', value: 25 },
      ],
    },
  ],
};

const categoryMeta = {
  coins: { sortBy: 'coins', label: 'Coins', emoji: emojis.boards.coins },
  kills: { sortBy: 'kills', label: 'Kills', emoji: emojis.boards.kills },
  survived: { sortBy: 'playtime', label: 'Survived', emoji: emojis.boards.survived },
};

export const autocomplete = playerAutocomplete;

export async function run(interaction) {
  await interaction.deferReply();
  const name = interaction.options.getString('player');
  const category = interaction.options.getString('category');
  const count = interaction.options.getInteger('count') || 10;
  const meta = categoryMeta[category];
  const info = await resolvePlayer(name);
  if (!info || !info.account) {
    await notFoundReply(interaction, name);
    return;
  }
  const raw = await apiPost('/games/fetch', { sortBy: meta.sortBy, timeRange: 'all', limit: 100, accountId: info.account.id });
  const seen = new Set();
  const deduped = [];
  for (const row of Array.isArray(raw) ? raw : []) {
    const key = `${row.date}|${row.coins}|${row.kills}|${row.playtime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  const games = deduped.slice(0, count);
  if (!games.length) {
    await interaction.editReply({
      embeds: [{
        color: colors.info,
        description: `No saved games found for **${escapeName(info.account.username)}**.`,
        footer: { text: 'Only games with 30m+ survived, 50+ kills, or 20,000+ coins are saved.' },
      }],
    });
    return;
  }
  const lines = games.map((g, i) => {
    const coins = formatNumber(g.coins);
    const kills = formatNumber(g.kills);
    const time = formatDuration(g.playtime);
    const when = g.date ? discordTimestamp(g.date, 'R') : '';
    if (category === 'coins') return `${medal(i + 1)} **${coins}** coins · ${kills} kills · ${time} · ${when}`;
    if (category === 'kills') return `${medal(i + 1)} **${kills}** kills · ${coins} coins · ${time} · ${when}`;
    return `${medal(i + 1)} **${time}** · ${coins} coins · ${kills} kills · ${when}`;
  });
  await interaction.editReply({
    embeds: [{
      title: `${meta.emoji} Best ${meta.label} games — ${escapeName(info.account.username)}`,
      color: colors.brand,
      description: lines.join('\n'),
      footer: { text: 'swordbattle.io' },
    }],
  });
}
