// Shut the Box (PD-142 extra games). Close tiles that add up to the roll; when none can, you score the open tiles (low wins, 0 = shut the box).
import { range, rank } from './util.js';

export const info = { id: 'shutbox', name: 'Shut the Box', minPlayers: 1, maxPlayers: 6, dice: { count: 2, sides: 6 },
  options: [{ id: 'tiles', label: 'Number of tiles', type: 'int', min: 9, max: 12, default: 9 },
            { id: 'oneDie', label: 'Roll one die once the high tiles are shut', type: 'bool', default: true },
            { id: 'rounds', label: 'Rounds', type: 'int', min: 1, max: 10, default: 1 }] };

const openTiles = t => range(t.length).filter(i => t[i]).map(i => i + 1);
const diceCount = (s, open) => s.options.oneDie && open.every(n => n <= 6) ? 1 : 2;
const subsets = (open, sum) => { const out = []; for (let m = 1; m < 1 << open.length; m++) { const p = open.filter((_, i) => m >> i & 1); if (p.reduce((a, b) => a + b, 0) === sum) out.push(p); } return out; };
const fresh = (s, player, round) => ({ player, round, open: range(s.options.tiles).map(() => true), dice: [], total: 0, rolled: false });

export const engine = {
  init(s) { const b = { ...s, over: false, totals: s.players.map(() => 0) }; b.turn = fresh(b, 0, 1); return b; },
  status(s) {
    const t = s.turn, open = openTiles(t.open);
    return { phase: s.over ? 'over' : t.rolled ? 'score' : 'roll', player: t.player, round: t.round, rounds: s.options.rounds, rollsUsed: 0, rollsLeft: null,
      canRoll: !s.over && !t.rolled, canHold: false, canScore: !s.over && t.rolled, canBank: false, held: t.dice.map(() => false), dice: t.dice.length ? t.dice.slice() : null,
      tiles: t.open.slice(), openTiles: open, openSum: open.reduce((a, b) => a + b, 0), scores: s.totals.slice(), lowWins: true,
      message: s.over ? 'Game over' : t.rolled ? `Close tiles adding to ${t.total}` : `${s.players[t.player]}: roll` };
  },
  rollSpec(s) { const t = s.turn; if (s.over || t.rolled) return { slots: [], sides: [] }; const n = diceCount(s, openTiles(t.open)); return { slots: range(n), sides: range(n).map(() => 6) }; },
  act(s, a, ev) {
    const t = s.turn, open = openTiles(t.open);
    if (s.over) return 'The game is over';
    if (a.type === 'roll') {
      if (t.rolled) return 'Close tiles first';
      const n = diceCount(s, open);
      if (!Array.isArray(a.values) || a.values.length !== n || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return `Expected ${n} value${n > 1 ? 's' : ''} from 1 to 6`;
      t.dice = a.values.slice(); t.total = t.dice.reduce((x, y) => x + y, 0); ev.push({ type: 'rolled', player: t.player, dice: t.dice.slice(), total: t.total });
      if (!subsets(open, t.total).length) return endTurn(s, ev);
      t.rolled = true; return;
    }
    if (a.type === 'score') {
      if (!t.rolled) return 'Roll first';
      const pick = a.tiles;
      if (!Array.isArray(pick) || !pick.length || new Set(pick).size !== pick.length || pick.some(n => !open.includes(n))) return 'Pick open tiles';
      if (pick.reduce((x, y) => x + y, 0) !== t.total) return `Tiles must add up to ${t.total}`;
      pick.forEach(n => { t.open[n - 1] = false; }); t.rolled = false; ev.push({ type: 'closed', player: t.player, tiles: pick.slice() });
      if (!openTiles(t.open).length) { ev.push({ type: 'shutTheBox', player: t.player }); return endTurn(s, ev); }
      return;
    }
    return 'Unknown action ' + a.type;
  },
  suggest(s) { const t = s.turn; if (s.over || !t.rolled) return []; return subsets(openTiles(t.open), t.total).map(p => ({ tiles: p, label: p.join(' + '), points: null, best: false })).sort((x, y) => y.tiles.length - x.tiles.length || y.tiles[0] - x.tiles[0]).map((r, i) => ({ ...r, best: i === 0 })); },
  scorecard: (s, p) => ({ sections: [], total: s.totals[p] }),
  result: s => s.over ? rank(s.players, s.totals, true) : null,
};

function endTurn(s, ev) {
  const t = s.turn, left = openTiles(t.open).reduce((a, b) => a + b, 0);
  s.totals[t.player] += left; ev.push({ type: 'turnScore', player: t.player, points: left });
  const np = (t.player + 1) % s.players.length, nr = np === 0 ? t.round + 1 : t.round;
  if (nr > s.options.rounds) { s.over = true; ev.push({ type: 'gameOver' }); return; }
  s.turn = fresh(s, np, nr); ev.push({ type: 'turn', player: np });
}
