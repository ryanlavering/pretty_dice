// Story Dice (PD-160 spike). Roll 3-9 glyph dice, arrange them in an order that makes sense, tell a story; the table rates it bad / fair / good and the points are entered by hand.
// The engine only knows face numbers and order. Which glyph is on which face is the UI's seeded deal (src/story.js); the engine keeps the options (pack list, set seed) so a saved game deals the same dice.
import { range, rank } from './util.js';

export const RATINGS = { bad: 0, fair: 1, good: 2 };   // owner: manual points, simple rating; the mapping is a design decision, see docs/design/story-dice-game.md
export const info = { id: 'story', name: 'Story Dice', minPlayers: 1, maxPlayers: 6, dice: { count: 5, sides: 12 }, noBots: true, hints: true,
  options: [
    { id: 'dice', label: 'Dice', type: 'int', min: 3, max: 9, default: 5 },
    { id: 'sides', label: 'Faces per die', type: 'choice', choices: [{ value: 6, label: 'd6' }, { value: 8, label: 'd8' }, { value: 12, label: 'd12' }, { value: 20, label: 'd20' }], default: 12 },
    { id: 'rounds', label: 'Stories each', type: 'int', min: 1, max: 10, default: 2 },
    { id: 'seed', label: 'Set number', type: 'int', min: 1, max: 999, default: 1 },
    { id: 'hints', label: 'Show word hints', type: 'bool', default: true },
    { id: 'packs', label: 'Glyph packs', type: 'multi', default: ['noto'], choices: [] }] };   // choices are filled in by the app from the glyph packs it carries

const fresh = (player, round) => ({ player, round, faces: null, order: null });
const complete = o => Array.isArray(o) && o.every(x => x !== null);

export const engine = {
  init: s => ({ ...s, over: false, scores: s.players.map(() => 0), tellings: s.players.map(() => []), turn: fresh(0, 1) }),
  status(s) {
    const t = s.turn, n = s.options.dice, phase = s.over ? 'over' : !t.faces ? 'roll' : complete(t.order) ? 'rate' : 'arrange';
    const who = s.players[t.player];
    return { phase, player: t.player, round: Math.min(t.round, s.options.rounds), rounds: s.options.rounds, rollsUsed: t.faces ? 1 : 0, rollsLeft: null, canRoll: phase === 'roll', canHold: false, canScore: false, canRate: phase === 'rate',
      held: Array(n).fill(false), dice: t.faces ? t.faces.slice() : null, order: t.order ? t.order.slice() : null, scores: s.scores.slice(),
      message: phase === 'over' ? 'Game over' : phase === 'roll' ? `${who}: roll the dice` : phase === 'arrange' ? `${who}: put the dice in story order` : `${who}: tell it, then rate the story` };
  },
  rollSpec: s => engine.status(s).canRoll ? { slots: range(s.options.dice), sides: range(s.options.dice).map(() => s.options.sides) } : { slots: [], sides: [] },
  act(s, a, ev) {
    const t = s.turn, st = engine.status(s), n = s.options.dice;
    if (s.over) return 'The game is over';
    if (a.type === 'roll') {
      if (!st.canRoll) return 'Already rolled';
      if (!Array.isArray(a.values) || a.values.length !== n || a.values.some(v => !Number.isInteger(v) || v < 1 || v > s.options.sides)) return `Expected ${n} values from 1 to ${s.options.sides}`;
      t.faces = a.values.slice(); t.order = Array(n).fill(null); ev.push({ type: 'rolled', player: t.player, dice: t.faces.slice() }); return;
    }
    if (a.type === 'arrange') {   // order[ring] = the die in that ring or null; a full order moves on to rating, taking a die out goes back to arranging
      if (!t.faces) return 'Roll first';
      const o = a.order; if (!Array.isArray(o) || o.length !== n || o.some(x => x !== null && (!Number.isInteger(x) || x < 0 || x >= n)) || new Set(o.filter(x => x !== null)).size !== o.filter(x => x !== null).length) return 'Bad order';
      t.order = o.slice(); ev.push({ type: 'arranged', player: t.player, complete: complete(o) }); return;
    }
    if (a.type === 'rate') {
      if (!st.canRate) return 'Put every die in order first';
      if (!(a.rating in RATINGS)) return 'Rating must be bad, fair or good';
      const pts = RATINGS[a.rating]; s.scores[t.player] += pts; s.tellings[t.player].push({ rating: a.rating, points: pts, faces: t.faces.slice(), order: t.order.slice() });
      ev.push({ type: 'scored', player: t.player, points: pts, rating: a.rating });
      const np = (t.player + 1) % s.players.length, nr = np === 0 ? t.round + 1 : t.round;
      if (nr > s.options.rounds) { s.over = true; ev.push({ type: 'gameOver' }); return; }
      s.turn = fresh(np, nr); ev.push({ type: 'turn', player: np }); return;
    }
    return 'Unknown action ' + a.type;
  },
  suggest: () => [],
  scorecard: (s, p) => ({ sections: [{ id: 'stories', label: 'Stories', rows: range(s.options.rounds).map(i => { const e = s.tellings[p][i]; return { category: 'story' + (i + 1), label: 'Story ' + (i + 1), points: e ? e.points : null, rating: e ? e.rating : null }; }) }], total: s.scores[p] }),
  result: s => s.over ? rank(s.players, s.scores) : null,
};
