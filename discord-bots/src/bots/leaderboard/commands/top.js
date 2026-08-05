import { boardByKey, fetchBoard } from '../boards.js';
import { colors, escapeName, formatDuration, formatNumber, medal } from '../../../lib/embeds.js';

export const def = {
  name: 'top',
  description: 'Show a swordbattle.io leaderboard top 10',
  options: [
    {
      type: 3,
      name: 'board',
      description: 'Which leaderboard',
      required: true,
      choices: [
        { name: 'Coins (best game)', value: 'coins' },
        { name: 'Kills (best game)', value: 'kills' },
        { name: 'Survived (best game)', value: 'survived' },
        { name: 'XP', value: 'xp' },
        { name: 'Mastery', value: 'mastery' },
        { name: 'Total Stabs', value: 'totalKills' },
        { name: 'Total Playtime', value: 'totalPlaytime' },
      ],
    },
    {
      type: 3,
      name: 'timeframe',
      description: 'Time range (default All-time)',
      required: false,
      choices: [
        { name: 'All-time', value: 'all' },
        { name: 'Past Day', value: 'day' },
        { name: 'Past Week', value: 'week' },
        { name: 'Past Month', value: 'month' },
      ],
    },
  ],
};

const timeframeLabels = { all: 'All-Time', day: 'Past Day', week: 'Past Week', month: 'Past Month' };

export async function run(interaction, ctx) {
  await interaction.deferReply();
  const boardKey = interaction.options.getString('board');
  const timeframe = interaction.options.getString('timeframe') || 'all';
  const board = boardByKey(boardKey);
  let rows;
  if (timeframe === 'all') {
    const cached = ctx.poller.getFreshBoard(boardKey);
    rows = cached ? cached.rows : await fetchBoard(board, 'all');
  } else {
    rows = await fetchBoard(board, timeframe);
  }
  const topRows = rows.slice(0, 10);
  if (!topRows.length) {
    await interaction.editReply({ embeds: [{ color: colors.info, description: 'No entries for this board yet.' }] });
    return;
  }
  const fmt = board.duration ? formatDuration : formatNumber;
  const lines = topRows.map((row, i) => `${medal(i + 1)} ${row.clanTag ? `[${escapeName(row.clanTag)}] ` : ''}**${escapeName(row.username)}** — ${fmt(row.value)}`);
  await interaction.editReply({
    embeds: [{
      title: `${board.emoji} ${board.label} — ${timeframeLabels[timeframe]}`,
      color: colors.brand,
      description: lines.join('\n'),
      footer: { text: 'swordbattle.io' },
    }],
  });
}
