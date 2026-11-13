// Bunco, single-table individual version (PD-142 extra games). Three dice; round n has target number n. Score on every roll and keep rolling until a roll scores nothing.
// 1 point per die showing the target; three of the target = Bunco (21); three of any other number = 5. A round is one turn for every player.
import { rank } from './util.js';

export const info = { id: 'bunco', name: 'Bunco', minPlayers: 1, maxPlayers: 6, dice: { count: 3, sides: 6 },
  options: [{ id: 'rounds', label: 'Rounds', type: 'int', min: 1, max: 6, default: 6 }] };

export function scoreRoll(dice, target) {
  const hit = dice.filter(v => v === target).length, triple = dice.every(v => v === dice[0]);
  if (triple && dice[0] === target) return { points: 21, kind: 'bunco' };
  if (triple) return { points: 5, kind: 'miniBunco' };
  return { points: hit, kind: hit ? 'target' : 'none' };
}
const fresh = (player, round) => ({ player, round, total: 0, dice: null });

export const engine = {
  init: s => ({ ...s, over: false, totals: s.players.map(() => 0), turn: fresh(0, 1) }),
  status(s) {
    const t = s.turn;
    return { phase: s.over ? 'over' : 'roll', player: t.player, round: t.round, rounds: s.options.rounds, targetNumber: t.round, rollsUsed: 0, rollsLeft: null,
      canRoll: !s.over, canHold: false, canScore: false, canBank: false, held: [false, false, false], dice: t.dice ? t.dice.slice() : null, turnTotal: t.total, scores: s.totals.slice(),
      message: s.over ? 'Game over' : `Round ${t.round}: roll for ${t.round}s` };
  },
  rollSpec: s => s.over ? { slots: [], sides: [] } : { slots: [0, 1, 2], sides: [6, 6, 6] },
  act(s, a, ev) {
    const t = s.turn;
    if (s.over) return 'The game is over';
    if (a.type !== 'roll') return 'Unknown action ' + a.type;
    if (!Array.isArray(a.values) || a.values.length !== 3 || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return 'Expected three values from 1 to 6';
    t.dice = a.values.slice(); const r = scoreRoll(t.dice, t.round);
    ev.push({ type: 'rolled', player: t.player, dice: t.dice.slice() });
    if (r.points) { t.total += r.points; s.totals[t.player] += r.points; ev.push({ type: 'scored', player: t.player, points: r.points, kind: r.kind }); return; }
    ev.push({ type: 'turnEnd', player: t.player, points: t.total });
    const np = (t.player + 1) % s.players.length, nr = np === 0 ? t.round + 1 : t.round;
    if (nr > s.options.rounds) { s.over = true; ev.push({ type: 'gameOver' }); return; }
    s.turn = { ...fresh(np, nr), dice: t.dice.slice() }; ev.push({ type: 'turn', player: np });
  },
  suggest: () => [],
  scorecard: (s, p) => ({ sections: [], total: s.totals[p] }),
  result: s => s.over ? rank(s.players, s.totals) : null,
};
