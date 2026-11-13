// Ship, Captain and Crew (PD-142 extra games). Five dice, three rolls. Lock a 6 (ship), then a 5 (captain), then a 4 (crew); the other two dice are your cargo.
import { range, rank } from './util.js';

export const info = { id: 'shipcaptain', name: 'Ship, Captain and Crew', minPlayers: 1, maxPlayers: 6, dice: { count: 5, sides: 6 },
  options: [{ id: 'rounds', label: 'Rounds', type: 'int', min: 1, max: 10, default: 3 }] };
const ROLES = [['ship', 6], ['captain', 5], ['crew', 4]];
const fresh = (player, round) => ({ player, round, rollsUsed: 0, dice: Array(5).fill(0), lock: { ship: null, captain: null, crew: null }, rolled: false });
const locked = t => ROLES.map(([r]) => t.lock[r]).filter(x => x !== null);
const live = t => range(5).filter(i => !locked(t).includes(i));
const crewed = t => t.lock.crew !== null;
const cargo = t => crewed(t) ? live(t).reduce((a, i) => a + t.dice[i], 0) : 0;

export const engine = {
  init(s) { return { ...s, over: false, totals: s.players.map(() => 0), turn: fresh(0, 1) }; },
  status(s) {
    const t = s.turn, over = s.over;
    return { phase: over ? 'over' : t.rolled ? 'score' : 'roll', player: t.player, round: t.round, rounds: s.options.rounds, rollsUsed: t.rollsUsed, rollsLeft: 3 - t.rollsUsed,
      canRoll: !over && t.rollsUsed < 3, canHold: false, canScore: false, canBank: !over && t.rolled && crewed(t) && t.rollsUsed < 3,
      held: range(5).map(i => locked(t).includes(i)), dice: t.rolled ? t.dice.slice() : null, lock: { ...t.lock }, cargo: cargo(t), scores: s.totals.slice(),
      message: over ? 'Game over' : !t.rolled ? `${s.players[t.player]}: roll` : crewed(t) ? `Cargo ${cargo(t)}: roll again or keep it` : `Roll ${t.rollsUsed} of 3` };
  },
  rollSpec(s) { const t = s.turn; if (s.over || t.rollsUsed >= 3) return { slots: [], sides: [] }; const slots = live(t); return { slots, sides: slots.map(() => 6) }; },
  act(s, a, ev) {
    const t = s.turn;
    if (s.over) return 'The game is over';
    if (a.type === 'roll') {
      if (t.rollsUsed >= 3) return 'No rolls left';
      const slots = live(t);
      if (!Array.isArray(a.values) || a.values.length !== slots.length || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return `Expected ${slots.length} values from 1 to 6`;
      slots.forEach((sl, k) => { t.dice[sl] = a.values[k]; }); t.rollsUsed++; t.rolled = true; ev.push({ type: 'rolled', player: t.player, dice: t.dice.slice() });
      for (const [role, face] of ROLES) {   // locks are automatic and happen in order within one roll
        if (t.lock[role] !== null) continue;
        const sl = live(t).find(i => t.dice[i] === face);
        if (sl === undefined) break;
        t.lock[role] = sl; ev.push({ type: role, player: t.player, slot: sl });
      }
      if (t.rollsUsed >= 3) return endTurn(s, ev);
      return;
    }
    if (a.type === 'bank') {
      if (!(t.rolled && crewed(t))) return 'You need ship, captain and crew first';
      return endTurn(s, ev);
    }
    return 'Unknown action ' + a.type;
  },
  suggest: () => [],
  scorecard: (s, p) => ({ sections: [], total: s.totals[p] }),
  result: s => s.over ? rank(s.players, s.totals) : null,
};

function endTurn(s, ev) {
  const t = s.turn, pts = cargo(t);
  s.totals[t.player] += pts; ev.push({ type: 'turnScore', player: t.player, points: pts, crewed: crewed(t) });
  const np = (t.player + 1) % s.players.length, nr = np === 0 ? t.round + 1 : t.round;
  if (nr > s.options.rounds) { s.over = true; ev.push({ type: 'gameOver' }); return; }
  s.turn = fresh(np, nr); ev.push({ type: 'turn', player: np });
}
