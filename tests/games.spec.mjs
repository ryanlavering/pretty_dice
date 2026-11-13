// Games rules engine (PD-142.3/.5): pure node tests with fixed dice sequences, no browser.
import { test, expect } from '@playwright/test';
import { listGames, newGame, status, rollSpec, act, suggest, result, scorecard } from '../games/index.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r; };
// Roll the dice the engine asks for, filling them from `vals`.
const roll = (s, vals) => ok(s, { type: 'roll', values: vals }).state;
const take = (s, category) => ok(s, { type: 'score', category }).state;
const pts = (s, cat) => suggest(s).find(r => r.category === cat).points;

test('listGames and newGame validate players and options @quick', () => {
  const g = listGames().find(x => x.id === 'yahtzee');
  expect(g.dice).toEqual({ count: 5, sides: 6 });
  expect(newGame('yahtzee', { players: ['A'] }).options.joker).toBe(true);
  expect(newGame('yahtzee', { players: ['A'], options: { joker: false } }).options.joker).toBe(false);
  expect(() => newGame('yahtzee', { players: [] })).toThrow();
  expect(() => newGame('yahtzee', { players: Array(7).fill('x') })).toThrow();
  expect(() => newGame('nope')).toThrow();
});

test('Yahtzee turn flow: roll, hold, reroll only the rest, three rolls max @quick', () => {
  let s = newGame('yahtzee', { players: ['A'] });
  expect(status(s)).toMatchObject({ phase: 'roll', canRoll: true, canHold: false, canScore: false });
  expect(rollSpec(s).slots).toEqual([0, 1, 2, 3, 4]);
  s = roll(s, [6, 6, 2, 3, 4]);
  expect(status(s)).toMatchObject({ phase: 'score', rollsLeft: 2, canHold: true, dice: [6, 6, 2, 3, 4] });
  s = ok(s, { type: 'hold', slot: 0 }).state; s = ok(s, { type: 'hold', slot: 1, held: true }).state;
  expect(rollSpec(s).slots).toEqual([2, 3, 4]);
  expect(act(s, { type: 'roll', values: [1, 2] }).ok).toBe(false);   // wrong count
  s = roll(s, [6, 6, 1]);
  expect(status(s).dice).toEqual([6, 6, 6, 6, 1]);
  s = roll(s, [2, 3, 4]);
  expect(status(s)).toMatchObject({ rollsLeft: 0, canRoll: false, canHold: false, dice: [6, 6, 2, 3, 4] });
  expect(rollSpec(s).slots).toEqual([]);
  expect(act(s, { type: 'roll', values: [1, 1, 1] }).ok).toBe(false);
});

test('Yahtzee scoring of every category @quick', () => {
  const sc = (dice) => { const s = roll(newGame('yahtzee', { players: ['A'] }), dice); return Object.fromEntries(suggest(s).map(r => [r.category, r.points])); };
  expect(sc([1, 1, 2, 3, 6])).toMatchObject({ ones: 2, twos: 2, threes: 3, sixes: 6, threeKind: 0, fullHouse: 0, chance: 13, yahtzee: 0 });
  expect(sc([4, 4, 4, 2, 5])).toMatchObject({ fours: 12, threeKind: 19, fourKind: 0 });
  expect(sc([3, 3, 3, 3, 5])).toMatchObject({ threeKind: 17, fourKind: 17, fullHouse: 0 });
  expect(sc([2, 2, 5, 5, 5])).toMatchObject({ fullHouse: 25, threeKind: 19 });
  expect(sc([2, 2, 2, 2, 2])).toMatchObject({ yahtzee: 50, fullHouse: 0, threeKind: 10, fourKind: 10 });   // 5 of a kind is not a full house without the joker rule
  expect(sc([1, 2, 3, 4, 6])).toMatchObject({ smallStraight: 30, largeStraight: 0 });
  expect(sc([2, 3, 4, 5, 6])).toMatchObject({ smallStraight: 30, largeStraight: 40 });
  expect(sc([1, 2, 3, 3, 4])).toMatchObject({ smallStraight: 30 });
  expect(sc([1, 2, 3, 5, 6])).toMatchObject({ smallStraight: 0 });
  const rows = suggest(roll(newGame('yahtzee', { players: ['A'] }), [5, 5, 5, 5, 5]));
  expect(rows.filter(r => r.best).map(r => r.category)).toEqual(['yahtzee']);
});

const UP = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
const LOWER = [['threeKind', [6, 6, 6, 1, 2], 21], ['fourKind', [5, 5, 5, 5, 1], 21], ['fullHouse', [2, 2, 3, 3, 3], 25], ['smallStraight', [1, 2, 3, 4, 6], 30],
  ['largeStraight', [2, 3, 4, 5, 6], 40], ['yahtzee', [4, 4, 4, 4, 4], 50], ['chance', [1, 2, 3, 4, 5], 15]];
// One full 13-turn game for the player at the current turn; returns the state.
const playRound = (s, boxes) => boxes.reduce((st, [cat, dice]) => take(roll(st, dice), cat), s);
const upperBoxes = UP.map((c, i) => [c, [i + 1, i + 1, i + 1, (i + 1) % 6 + 1, (i + 1) % 6 + 1]]);

test('upper bonus at 63 and a full one-player game scores 300 @quick', () => {
  let s = newGame('yahtzee', { players: ['Solo'] });
  const events = [];
  for (const [cat, dice] of [...upperBoxes, ...LOWER.map(([c, d]) => [c, d])]) { s = roll(s, dice); const t = ok(s, { type: 'score', category: cat }); events.push(...t.events); s = t.state; }
  expect(events.filter(e => e.type === 'bonus').map(e => e.name)).toEqual(['Upper bonus']);
  expect(status(s).phase).toBe('over');
  const card = scorecard(s, 0);
  expect(card.sections[0]).toMatchObject({ subtotal: 63, bonus: 35 });
  expect(card.total).toBe(300);
  expect(result(s)).toEqual({ ranking: [{ player: 0, name: 'Solo', total: 300, rank: 1 }], winners: [0] });
  expect(act(s, { type: 'roll', values: [1, 1, 1, 1, 1] }).ok).toBe(false);
});

test('used categories are refused and turns pass between players @quick', () => {
  let s = newGame('yahtzee', { players: ['A', 'B'] });
  s = take(roll(s, [1, 1, 2, 3, 4]), 'ones');
  expect(status(s)).toMatchObject({ player: 1, round: 1, rollsUsed: 0 });
  s = roll(s, [1, 1, 1, 1, 1]);
  expect(act(s, { type: 'score', category: 'bogus' }).ok).toBe(false);
  s = take(s, 'ones');                           // B may use ones (separate card)
  expect(status(s)).toMatchObject({ player: 0, round: 2 });
  s = roll(s, [3, 3, 3, 3, 3]);
  const bad = act(s, { type: 'score', category: 'ones' });
  expect(bad.ok).toBe(false); expect(bad.error).toMatch(/already used/); expect(bad.state).toBe(s);
  expect(act(newGame('yahtzee', { players: ['A'] }), { type: 'score', category: 'chance' }).ok).toBe(false);   // roll first
});

test('Yahtzee bonus and forced Joker rule @quick', () => {
  const start = () => take(roll(newGame('yahtzee', { players: ['A'] }), [5, 5, 5, 5, 5]), 'yahtzee');
  let s = roll(start(), [3, 3, 3, 3, 3]);
  // joker: must use threes first; fixed boxes then score in full
  expect(act(s, { type: 'score', category: 'chance' }).ok).toBe(false);
  expect(suggest(s).filter(r => r.open && r.points != null).map(r => r.category)).toContain('threes');
  const r = ok(s, { type: 'score', category: 'threes' });
  expect(r.events).toContainEqual({ type: 'bonus', player: 0, name: 'Yahtzee bonus', points: 100 });
  expect(scorecard(r.state, 0).total).toBe(50 + 15 + 100);
  // upper box taken: lower boxes open with full value
  let t = take(roll(start(), [3, 3, 3, 3, 3]), 'threes');
  t = roll(t, [3, 3, 3, 3, 3]);
  expect(pts(t, 'fullHouse')).toBe(25); expect(pts(t, 'largeStraight')).toBe(40); expect(pts(t, 'chance')).toBe(15);
  // joker option off: any open box, regular scoring, bonus still paid
  let o = take(roll(newGame('yahtzee', { players: ['A'], options: { joker: false } }), [5, 5, 5, 5, 5]), 'yahtzee');
  o = roll(o, [3, 3, 3, 3, 3]);
  expect(pts(o, 'fullHouse')).toBe(0); expect(act(o, { type: 'score', category: 'chance' }).ok).toBe(true);
  // a zeroed Yahtzee box earns no bonus
  let z = take(roll(newGame('yahtzee', { players: ['A'] }), [1, 2, 3, 4, 6]), 'yahtzee');
  z = ok(roll(z, [2, 2, 2, 2, 2]), { type: 'score', category: 'twos' });
  expect(z.events.some(e => e.name === 'Yahtzee bonus')).toBe(false);
});

test('state round-trips through JSON and act never mutates its input @quick', () => {
  let s = roll(newGame('yahtzee', { players: ['A', 'B'] }), [1, 2, 3, 4, 5]);
  const frozen = JSON.stringify(s);
  act(s, { type: 'score', category: 'chance' });
  expect(JSON.stringify(s)).toBe(frozen);
  const back = JSON.parse(frozen);
  expect(act(back, { type: 'score', category: 'chance' }).state).toEqual(act(s, { type: 'score', category: 'chance' }).state);
  expect(status(back)).toEqual(status(s));
});

test('two players finishing level share rank 1 @quick', () => {
  let s = newGame('yahtzee', { players: ['A', 'B'] });
  const turns = [...upperBoxes, ...LOWER.map(([c, d]) => [c, d])];
  for (const box of turns) s = playRound(playRound(s, [box]), [box]);   // A then B play identical boxes
  expect(result(s).winners).toEqual([0, 1]);
  expect(result(s).ranking.map(r => r.rank)).toEqual([1, 1]);
});
