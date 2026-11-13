// Small helpers shared by the stateful engines.
export const range = n => Array.from({ length: n }, (_, i) => i);
export function rank(players, totals, lowWins = false) {
  const d = lowWins ? -1 : 1;
  const rows = players.map((name, player) => ({ player, name, total: totals[player] })).sort((a, b) => d * (b.total - a.total) || a.player - b.player);
  rows.forEach((r, i) => { r.rank = i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
  return { ranking: rows, winners: rows.filter(r => r.rank === 1).map(r => r.player) };
}
