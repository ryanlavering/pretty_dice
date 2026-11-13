// Farkle and Pig engines (PD-142.6): pure node tests with fixed dice sequences.
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, suggest, result, scorecard } from '../games/index.js';
import { scoreSet } from '../games/farkle.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r; };
const roll = (s, v) => ok(s, { type: 'roll', values: v }).state;
const set = (s, dice) => ok(s, { type: 'score', dice }).state;
const bank = s => ok(s, { type: 'bank' }).state;
const farkle = (opts = {}, players = ['A', 'B']) => newGame('farkle', { players, options: opts });

test('Farkle scoreSet: singles, kinds, straight, three pairs, dead dice @quick', () => {
  expect(scoreSet([1])).toBe(100); expect(scoreSet([5])).toBe(50); expect(scoreSet([1, 5, 5])).toBe(200);
  expect(scoreSet([2, 2, 2])).toBe(200); expect(scoreSet([1, 1, 1])).toBe(1000); expect(scoreSet([5, 5, 5])).toBe(500);
  expect(scoreSet([2, 2, 2, 2])).toBe(400); expect(scoreSet([3, 3, 3, 3, 3])).toBe(1200); expect(scoreSet([1, 1, 1, 1, 1, 1])).toBe(8000);
  expect(scoreSet([1, 2, 3, 4, 5, 6])).toBe(1500); expect(scoreSet([2, 2, 3, 3, 4, 4])).toBe(1500);
  expect(scoreSet([1, 2])).toBe(0); expect(scoreSet([2, 2])).toBe(0); expect(scoreSet([1, 2, 2, 2, 4])).toBe(0); expect(scoreSet([])).toBe(0);
});

test('Farkle turn: bust passes the turn, set-aside must score, roll the rest @quick', () => {
  let s = farkle();
  expect(rollSpec(s).slots).toEqual([0, 1, 2, 3, 4, 5]);
  const b = ok(s, { type: 'roll', values: [2, 2, 3, 4, 6, 6] });
  expect(b.events.map(e => e.type)).toEqual(['rolled', 'bust', 'turn']);
  expect(status(b.state)).toMatchObject({ player: 1, turnTotal: 0, scores: [0, 0] });
  s = roll(s, [1, 2, 2, 3, 4, 6]);
  expect(status(s)).toMatchObject({ phase: 'score', canRoll: false, canBank: false });
  expect(suggest(s)).toEqual([{ slots: [0], points: 100, label: '1', best: true }]);
  expect(act(s, { type: 'score', dice: [1] }).ok).toBe(false);          // a 2 does not score alone
  expect(act(s, { type: 'score', dice: [0, 1] }).ok).toBe(false);
  expect(act(s, { type: 'score', dice: [] }).ok).toBe(false);
  s = set(s, [0]);
  expect(status(s)).toMatchObject({ phase: 'roll', turnTotal: 100, held: [true, false, false, false, false, false] });
  expect(rollSpec(s).slots).toEqual([1, 2, 3, 4, 5]);
  expect(act(s, { type: 'roll', values: [1, 1, 1, 1, 1, 1] }).ok).toBe(false);   // wrong count
  s = roll(s, [5, 3, 3, 3, 6]);
  expect(suggest(s).map(r => r.points)).toEqual([350, 300, 50]);
  expect(suggest(s)[0]).toMatchObject({ slots: [1, 2, 3, 4], best: true });
});

test('Farkle hot dice: scoring all six rolls all six again @quick', () => {
  let s = roll(farkle(), [1, 1, 1, 5, 5, 5]);
  const r = ok(s, { type: 'score', dice: [0, 1, 2, 3, 4, 5] });
  expect(r.events.map(e => e.type)).toEqual(['setAside', 'hotDice']);
  s = r.state;
  expect(status(s)).toMatchObject({ turnTotal: 1500, canRoll: true, canBank: true, held: Array(6).fill(false) });
  expect(rollSpec(s).slots).toEqual([0, 1, 2, 3, 4, 5]);
});

test('Farkle opening score: cannot bank under the minimum until on the board @quick', () => {
  let s = set(roll(farkle(), [5, 5, 2, 3, 4, 6]), [0, 1]);
  expect(status(s)).toMatchObject({ turnTotal: 100, canBank: false });
  expect(act(s, { type: 'bank' }).error).toMatch(/500/);
  s = roll(s, [1, 1, 1, 2]);   // four live dice
  s = bank(set(s, [2, 3, 4]));   // live slots are 2-5; 100 + 1000
  expect(status(s)).toMatchObject({ player: 1, scores: [1100, 0] });
  expect(scorecard(s, 0)).toMatchObject({ total: 1100, onBoard: true });
  const free = farkle({ opening: 0 });
  expect(status(set(roll(free, [5, 2, 2, 3, 4, 6]), [0])).canBank).toBe(true);
});

test('Farkle final round: others get one last turn, then the game ends @quick', () => {
  let s = farkle({ target: 1000, opening: 0 }, ['A', 'B', 'C']);
  s = bank(set(roll(s, [1, 1, 1, 2, 3, 4]), [0, 1, 2]));   // A reaches 1000
  expect(status(s)).toMatchObject({ player: 1, finalRound: true });
  s = bank(set(roll(s, [1, 2, 3, 4, 4, 6]), [0]));          // B banks 100
  s = ok(s, { type: 'roll', values: [2, 3, 4, 4, 6, 6] }).state;   // C busts; back to A -> over
  expect(status(s).phase).toBe('over');
  expect(result(s)).toEqual({ ranking: [{ player: 0, name: 'A', total: 1000, rank: 1 }, { player: 1, name: 'B', total: 100, rank: 2 }, { player: 2, name: 'C', total: 0, rank: 3 }], winners: [0] });
  expect(act(s, { type: 'roll', values: [1, 1, 1, 1, 1, 1] }).ok).toBe(false);
});

test('Pig: rolling a 1 loses the turn, bank keeps it, target wins @quick', () => {
  let s = newGame('pig', { players: ['A', 'B'], options: { target: 20 } });
  expect(rollSpec(s)).toEqual({ slots: [0], sides: [6] });
  expect(act(s, { type: 'bank' }).ok).toBe(false);
  s = roll(roll(roll(s, [6]), [6]), [6]);
  expect(status(s)).toMatchObject({ turnTotal: 18, canBank: true, dice: [6] });
  s = bank(s);
  expect(status(s)).toMatchObject({ player: 1, scores: [18, 0], turnTotal: 0 });
  const bust = ok(roll(s, [4]), { type: 'roll', values: [1] });
  expect(bust.events.map(e => e.type)).toEqual(['rolled', 'bust', 'turn']);
  s = bust.state;
  expect(status(s)).toMatchObject({ player: 0, scores: [18, 0], turnTotal: 0 });
  expect(act(s, { type: 'roll', values: [7] }).ok).toBe(false);
  s = bank(roll(s, [2]));
  expect(status(s).phase).toBe('over');
  expect(result(s).winners).toEqual([0]);
});

test('Farkle and Pig state is plain JSON and act does not mutate input @quick', () => {
  for (const [id, vals] of [['farkle', [1, 2, 2, 3, 4, 6]], ['pig', [3]]]) {
    const s = roll(newGame(id, { players: ['A'] }), vals), frozen = JSON.stringify(s);
    act(s, { type: 'bank' }); expect(JSON.stringify(s)).toBe(frozen);
    expect(status(JSON.parse(frozen))).toEqual(status(s));
  }
});
