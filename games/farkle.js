// Farkle (PD-142.6). Six dice. Every die you set aside must score. Hot dice (all six scored) roll all six again.
// Scoring: 1 = 100, 5 = 50; three of a kind = face*100 (1s = 1000), each extra die doubles it; 1-2-3-4-5-6 = 1500; three pairs = 1500.
import { range, rank } from './util.js';

export const info = { id: 'farkle', name: 'Farkle', minPlayers: 1, maxPlayers: 6, dice: { count: 6, sides: 6 },
  options: [{ id: 'target', label: 'Target score', type: 'int', min: 1000, max: 20000, default: 10000 },
            { id: 'opening', label: 'Minimum to get on the board', type: 'int', min: 0, max: 1000, default: 500 }] };

// Points for a set of dice where EVERY die must score; 0 if any die is unused.
export function scoreSet(dice) {
  const c = [0, 0, 0, 0, 0, 0, 0]; dice.forEach(v => c[v]++);
  const n = dice.length; if (!n) return 0;
  if (n === 6 && c.slice(1).every(x => x === 1)) return 1500;
  if (n === 6 && c.slice(1).filter(x => x === 2).length === 3) return 1500;
  let pts = 0;
  for (let f = 1; f <= 6; f++) {
    if (c[f] >= 3) pts += (f === 1 ? 1000 : f * 100) * 2 ** (c[f] - 3);
    else if (f === 1) pts += 100 * c[f];
    else if (f === 5) pts += 50 * c[f];
    else if (c[f]) return 0;
  }
  return pts;
}
// All non-empty subsets (as slot lists) of the live dice that fully score.
export function options(dice, slots) {
  const out = [];
  for (let m = 1; m < 1 << slots.length; m++) {
    const pick = slots.filter((_, i) => m >> i & 1), p = scoreSet(pick.map(sl => dice[sl]));
    if (p > 0) out.push({ slots: pick, points: p });
  }
  return out;
}

const live = t => range(6).filter(i => !t.aside.includes(i));
const fresh = (player) => ({ player, aside: [], dice: Array(6).fill(0), rolled: false, total: 0 });

export const engine = {
  init: s => ({ ...s, over: false, scores: s.players.map(() => 0), onBoard: s.players.map(() => s.options.opening === 0), final: null, turn: fresh(0) }),
  status(s) {
    const t = s.turn, boardOk = s.onBoard[t.player] || t.total >= s.options.opening;
    return { phase: s.over ? 'over' : t.rolled ? 'score' : 'roll', player: t.player, round: 0, rounds: null, rollsUsed: 0, rollsLeft: null,
      canRoll: !s.over && !t.rolled, canHold: false, canScore: !s.over && t.rolled, canBank: !s.over && !t.rolled && t.total > 0 && boardOk,
      held: range(6).map(i => t.aside.includes(i)), dice: t.dice.some(Boolean) ? t.dice.slice() : null,
      turnTotal: t.total, scores: s.scores.slice(), finalRound: !!s.final, target: s.options.target,
      message: s.over ? 'Game over' : t.rolled ? 'Set aside scoring dice' : t.total ? `${t.total} this turn: roll or bank` : `${s.players[t.player]}: roll` };
  },
  rollSpec(s) { const t = s.turn; if (s.over || t.rolled) return { slots: [], sides: [] }; const slots = live(t); return { slots, sides: slots.map(() => 6) }; },
  act(s, a, ev) {
    const t = s.turn, st = this.status(s);
    if (s.over) return 'The game is over';
    if (a.type === 'roll') {
      if (!st.canRoll) return 'Set aside scoring dice first';
      const slots = live(t);
      if (!Array.isArray(a.values) || a.values.length !== slots.length || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return `Expected ${slots.length} values from 1 to 6`;
      slots.forEach((sl, k) => { t.dice[sl] = a.values[k]; });
      ev.push({ type: 'rolled', player: t.player, dice: t.dice.slice() });
      if (!options(t.dice, slots).length) { ev.push({ type: 'bust', player: t.player, lost: t.total }); return advance(s, ev); }
      t.rolled = true; return;
    }
    if (a.type === 'score') {
      if (!st.canScore) return 'Roll first';
      const pick = a.dice, slots = live(t);
      if (!Array.isArray(pick) || !pick.length || new Set(pick).size !== pick.length || pick.some(i => !slots.includes(i))) return 'Pick dice from this roll';
      const p = scoreSet(pick.map(i => t.dice[i]));
      if (!p) return 'Every die you set aside must score';
      t.total += p; t.aside.push(...pick); t.rolled = false; ev.push({ type: 'setAside', player: t.player, slots: pick, points: p });
      if (t.aside.length === 6) { t.aside = []; t.dice = Array(6).fill(0); ev.push({ type: 'hotDice', player: t.player }); }
      return;
    }
    if (a.type === 'bank') {
      if (!st.canBank) return t.total > 0 ? `Need ${s.options.opening} to get on the board` : 'Nothing to bank';
      s.scores[t.player] += t.total; s.onBoard[t.player] = true; ev.push({ type: 'banked', player: t.player, points: t.total });
      if (!s.final && s.scores[t.player] >= s.options.target) { s.final = { by: t.player }; ev.push({ type: 'finalRound', player: t.player }); }
      return advance(s, ev);
    }
    return 'Unknown action ' + a.type;
  },
  suggest(s) {
    const t = s.turn; if (s.over || !t.rolled) return [];
    const rows = options(t.dice, live(t)).map(o => ({ slots: o.slots, points: o.points, label: o.slots.map(i => t.dice[i]).sort().join(' '), best: false }));
    const top = Math.max(...rows.map(r => r.points)); const b = rows.find(r => r.points === top); if (b) b.best = true;
    return rows.sort((x, y) => y.points - x.points);
  },
  scorecard: (s, p) => ({ sections: [], total: s.scores[p], turnTotal: s.turn.player === p ? s.turn.total : 0, onBoard: s.onBoard[p] }),
  result: s => s.over ? rank(s.players, s.scores) : null,
};

function advance(s, ev) {
  const np = (s.turn.player + 1) % s.players.length;
  if (s.final && np === s.final.by) { s.over = true; ev.push({ type: 'gameOver' }); return; }
  s.turn = fresh(np); ev.push({ type: 'turn', player: np });
}
