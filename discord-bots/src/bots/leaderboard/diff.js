export function diffTop(oldTop, newTop) {
  const oldRank = new Map();
  oldTop.forEach((row, i) => oldRank.set(row.username, i + 1));
  const newRank = new Map();
  newTop.forEach((row, i) => newRank.set(row.username, i + 1));
  const newEntries = [];
  const rankUps = [];
  const rankDowns = [];
  const exits = [];
  newTop.forEach((row, i) => {
    const rank = i + 1;
    const prev = oldRank.get(row.username);
    if (prev === undefined) newEntries.push({ username: row.username, rank, value: row.value, fp: row.fp || null });
    else if (rank < prev) rankUps.push({ username: row.username, from: prev, to: rank, value: row.value });
    else if (rank > prev) rankDowns.push({ username: row.username, from: prev, to: rank });
  });
  oldTop.forEach((row, i) => {
    if (!newRank.has(row.username)) exits.push({ username: row.username, lastRank: i + 1, lastValue: row.value, fp: row.fp || null });
  });
  const renames = [];
  for (let i = exits.length - 1; i >= 0; i -= 1) {
    const exit = exits[i];
    const j = newEntries.findIndex((n) => (exit.fp && n.fp ? exit.fp === n.fp : exit.lastValue > 0 && exit.lastValue === n.value));
    if (j === -1) continue;
    const entry = newEntries[j];
    renames.push({ from: exit.username, to: entry.username, rank: entry.rank, value: entry.value });
    exits.splice(i, 1);
    newEntries.splice(j, 1);
  }
  return { newEntries, rankUps, rankDowns, exits, renames };
}

export function isEmptyDiff(d) {
  return !d.newEntries.length && !d.rankUps.length && !d.rankDowns.length && !d.exits.length && !d.renames.length;
}

export function hasRealEvents(d) {
  return !!(d.newEntries.length || d.rankUps.length || d.rankDowns.length || d.exits.length);
}
