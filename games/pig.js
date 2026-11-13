// Pig (PD-142.6). One die: roll until you bank or roll a 1 (lose the turn's points). First to the target wins.
import { rank } from './util.js';

export const info = { id: 'pig', name: 'Pig', minPlayers: 1, maxPlayers: 6, dice: { count: 1, sides: 6 },
  options: [{ id: 'target', label: 'Target score', type: 'int', min: 20, max: 200, default: 100 }] };

export const engine = {
  init: s => ({ ...s, over: false, scores: s.players.map(() => 0), turn: { player: 0, total: 0, last: null } }),
  status(s) {
    const t = s.turn;
    return { phase: s.over ? 'over' : 'roll', player: t.player, round: 0, rounds: null, rollsUsed: 0, rollsLeft: null, canRoll: !s.over, canHold: false, canScore: false,
      canBank: !s.over && t.total > 0, held: [false], dice: t.last ? [t.last] : null, turnTotal: t.total, scores: s.scores.slice(), target: s.options.target,
      message: s.over ? 'Game over' : t.total ? `${t.total} this turn: roll or bank` : `${s.players[t.player]}: roll` };
  },
  rollSpec: s => s.over ? { slots: [], sides: [] } : { slots: [0], sides: [6] },
  act(s, a, ev) {
    const t = s.turn;
    if (s.over) return 'The game is over';
    if (a.type === 'roll') {
      if (!Array.isArray(a.values) || a.values.length !== 1 || !Number.isInteger(a.values[0]) || a.values[0] < 1 || a.values[0] > 6) return 'Expected one value from 1 to 6';
      const v = a.values[0]; ev.push({ type: 'rolled', player: t.player, dice: [v] });
      if (v === 1) { ev.push({ type: 'bust', player: t.player, lost: t.total }); return next(s, ev, 1); }
      t.total += v; t.last = v; return;
    }
    if (a.type === 'bank') {
      if (t.total === 0) return 'Nothing to bank';
      s.scores[t.player] += t.total; ev.push({ type: 'banked', player: t.player, points: t.total });
      if (s.scores[t.player] >= s.options.target) { s.over = true; ev.push({ type: 'gameOver' }); return; }
      return next(s, ev);
    }
    return 'Unknown action ' + a.type;
  },
  suggest: () => [],
  scorecard: (s, p) => ({ sections: [], total: s.scores[p], turnTotal: s.turn.player === p ? s.turn.total : 0 }),
  result: s => s.over ? rank(s.players, s.scores) : null,
};

function next(s, ev, last = null) { const np = (s.turn.player + 1) % s.players.length; s.turn = { player: np, total: 0, last }; ev.push({ type: 'turn', player: np }); }
