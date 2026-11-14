// Liar's Dice and the viewer rule (PD-142.17): hidden dice never reach a viewer who may not see them.
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, suggest, result, redact } from '../games/index.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r; };
const err = (s, a) => { const r = act(s, a); expect(r.ok, JSON.stringify(a)).toBe(false); expect(r.state).toBe(s); return r.error; };
const game = (opts = {}, players = ['A', 'B']) => newGame('liarsdice', { players, options: { dice: 3, ...opts } });
// Everyone rolls their cup in seat order with the given hands.
const rollAll = (s, hands) => hands.reduce((st, h) => ok(st, { type: 'roll', values: h }).state, s);
const bid = (s, quantity, face) => ok(s, { type: 'bid', quantity, face }).state;

test('setup: two to six players, private rolls in seat order @quick', () => {
  expect(() => newGame('liarsdice', { players: ['A'] })).toThrow();
  let s = newGame('liarsdice', { players: ['A', 'B', 'C'] });
  expect(status(s)).toMatchObject({ phase: 'roll', player: 0, handoff: 0, totalDice: 15, wild: true, canBid: false });
  expect(rollSpec(s)).toEqual({ slots: [0, 1, 2, 3, 4], sides: [6, 6, 6, 6, 6], private: true, player: 0 });
  expect(err(s, { type: 'roll', values: [1, 2, 3] })).toMatch(/Expected 5 values/);
  expect(err(s, { type: 'bid', quantity: 1, face: 2 })).toMatch(/Not the time/);
  const r = ok(s, { type: 'roll', values: [1, 2, 3, 4, 5] });
  expect(r.events).toEqual([{ type: 'rolled', player: 0, private: true }]);   // the event carries no dice
  expect(status(r.state)).toMatchObject({ phase: 'roll', player: 1, handoff: 1 });
  s = rollAll(s, [[1, 2, 3, 4, 5], [2, 2, 2, 2, 2], [6, 6, 6, 6, 6]]);
  expect(status(s)).toMatchObject({ phase: 'bid', player: 0, handoff: 0, canBid: true, canChallenge: false });
  expect(rollSpec(s)).toEqual({ slots: [], sides: [] });
});

test('bid rules: raise the quantity or the face, wild ones, limits, no first-bid challenge @quick', () => {
  let s = rollAll(game(), [[4, 4, 6], [4, 2, 1]]);
  expect(err(s, { type: 'challenge' })).toMatch(/no bid/);
  expect(err(s, { type: 'bid', quantity: 1, face: 1 })).toMatch(/Ones are wild/);
  expect(err(s, { type: 'bid', quantity: 1, face: 7 })).toMatch(/1 to 6/);
  expect(err(s, { type: 'bid', quantity: 0, face: 3 })).toMatch(/too high/);
  expect(err(s, { type: 'bid', quantity: 7, face: 3 })).toMatch(/6 dice/);
  s = bid(s, 2, 4);
  expect(status(s)).toMatchObject({ player: 1, bid: { player: 0, quantity: 2, face: 4 }, canChallenge: true });
  for (const [q, f] of [[2, 4], [2, 3], [1, 6]]) expect(err(s, { type: 'bid', quantity: q, face: f })).toMatch(/raise/);
  expect(bid(s, 2, 5)).toBeTruthy(); expect(bid(s, 3, 2)).toBeTruthy();
  const plain = rollAll(game({ wild: false }), [[4, 4, 6], [4, 2, 1]]);
  expect(bid(plain, 1, 1)).toBeTruthy();   // ones are an ordinary face without the wild option
});

test('what each viewer sees; a hidden die can never change another viewer\'s view @quick', () => {
  const a = rollAll(game(), [[4, 4, 6], [4, 2, 1]]), b = rollAll(game(), [[4, 4, 6], [3, 3, 5]]);   // differ only in player 1's dice
  const dice = (s, v) => status(s, v).cups.map(c => c.dice);
  expect(dice(a, 0)).toEqual([[4, 4, 6], null]);
  expect(dice(a, 1)).toEqual([null, [4, 2, 1]]);
  expect(dice(a, null)).toEqual([null, null]);
  expect(dice(a)).toEqual([[4, 4, 6], [4, 2, 1]]); expect(dice(a, 'all')).toEqual(dice(a));
  expect(status(a, 0)).toEqual(status(b, 0));                       // the leak test: identical views
  expect(status(a, null)).toEqual(status(b, null));
  expect(suggest(a, 0)).toEqual(suggest(b, 0));                     // hints depend only on the viewer's own dice
  expect(status(a, 1)).not.toEqual(status(b, 1));
  expect(JSON.stringify(status(a, 0))).not.toContain('4,2,1');       // player 1's dice appear nowhere in A's view
  expect(JSON.stringify(status(a, null))).not.toMatch(/4,4,6|4,2,1/);
  const r = redact(a, 0);
  expect(r.hands).toEqual([[4, 4, 6], null]); expect(r.redacted).toBe(true);
  expect(redact(a, null).hands).toEqual([null, null]);
  expect(err(r, { type: 'bid', quantity: 1, face: 2 })).toMatch(/redacted/);
  expect(JSON.stringify(a)).toContain('[4,2,1]');                   // the full state still holds every die
});

test('challenge: a true bid costs the challenger a die, a false bid costs the bidder; the loser starts @quick', () => {
  const start = () => rollAll(game(), [[4, 4, 6], [4, 2, 1]]);   // fours: 3 + the wild one = 4
  let s = bid(start(), 4, 4);                                    // true
  const t = ok(s, { type: 'challenge' });
  expect(t.events.map(e => e.type)).toEqual(['challenge', 'reveal', 'lostDie']);
  expect(t.events[1]).toMatchObject({ count: 4, quantity: 4, face: 4, bidTrue: true, loser: 1, winner: 0 });
  s = t.state;
  expect(status(s)).toMatchObject({ phase: 'reveal', handoff: null, canNext: true, cups: [{ count: 3 }, { count: 2 }] });
  expect(status(s, 0).cups.map(c => c.dice)).toEqual([[4, 4, 6], [4, 2, 1]]);   // everything is public in the reveal
  expect(status(s, null).reveal).toMatchObject({ bidTrue: true, loser: 1 });
  expect(err(s, { type: 'bid', quantity: 1, face: 2 })).toMatch(/Not the time/);
  s = ok(s, { type: 'next' }).state;
  expect(status(s)).toMatchObject({ phase: 'roll', round: 2, totalDice: 5 });
  expect(rollSpec(s).slots).toHaveLength(3);                     // A rolls 3
  s = rollAll(s, [[1, 1, 1], [2, 2]]);
  expect(status(s)).toMatchObject({ phase: 'bid', player: 1 });  // the loser (B) opens
  const lost = ok(bid(start(), 5, 4), { type: 'challenge' });                       // 4 fours, bid of 5: false, A (the bidder) loses
  expect(lost.events[1]).toMatchObject({ bidTrue: false, loser: 0, winner: 1 });
  const f = bid(rollAll(ok(lost.state, { type: 'next' }).state, [[1, 1], [1, 1, 1]]), 1, 2);   // A opened the new round
  expect(status(f).cups.map(c => c.count)).toEqual([2, 3]);
  expect(status(f)).toMatchObject({ player: 1, bid: { player: 0 } });
  const noWild = rollAll(game({ wild: false }), [[4, 4, 6], [4, 2, 1]]);
  expect(ok(bid(noWild, 4, 4), { type: 'challenge' }).events[1]).toMatchObject({ count: 3, bidTrue: false, loser: 0 });
});

test('elimination ends the game; rank is winner first, then later out is better @quick', () => {
  let s = game();
  for (const sizes of [[[2, 2, 2], [2, 2, 2]], [[2, 2], [2, 2, 2]], [[2], [2, 2, 2]]]) {
    s = rollAll(s, sizes);
    s = bid(s, 1, 6);                                           // no sixes, no ones: false
    s = ok(s, { type: 'challenge' }).state;
    if (status(s).phase === 'reveal') s = ok(s, { type: 'next' }).state;
  }
  expect(status(s)).toMatchObject({ phase: 'over', cups: [{ count: 0 }, { count: 3 }] });
  expect(result(s)).toEqual({ ranking: [{ player: 1, name: 'B', total: 3, rank: 1 }, { player: 0, name: 'A', total: 0, rank: 2 }], winners: [1] });
  const last = act(rollAll(game(), [[2, 2, 2], [2, 2, 2]]), { type: 'roll', values: [1, 1, 1] });
  expect(last.ok).toBe(false);
  let three = newGame('liarsdice', { players: ['A', 'B', 'C'], options: { dice: 3 } });
  three = rollAll(three, [[2, 2, 2], [2, 2, 2], [2, 2, 2]]);
  three = ok(bid(three, 1, 6), { type: 'challenge' }).state;       // B challenges A's false bid: A loses a die, A opens again
  expect(status(three).cups.map(c => c.count)).toEqual([2, 3, 3]);
  expect(result(three)).toBeNull();
});

test('suggest: chances are exact for the viewer\'s own dice @quick', () => {
  let s = rollAll(game(), [[4, 4, 6], [4, 2, 1]]);
  const rows = suggest(s, 0);
  expect(rows.find(r => r.label === '2 x 4').chance).toBe(1);                 // two fours in hand
  expect(rows.find(r => r.label === '4 x 4').chance).toBeCloseTo(7 / 27, 10);  // need two more fours or ones from 3 unknown dice
  expect(rows.find(r => r.label === '6 x 6').chance).toBe(0);
  s = bid(s, 4, 4);
  const hint = suggest(s, 1);
  expect(hint[0]).toMatchObject({ kind: 'challenge' });
  expect(hint[0].chance).toBeCloseTo(20 / 27, 10);                             // viewer 1 holds a 4 and a 1: needs 2 of 3 unknown
  expect(hint.slice(1).every(r => r.quantity > 4 || (r.quantity === 4 && r.face > 4))).toBe(true);
  expect(suggest(game())).toEqual([]);                                         // nothing before the dice are rolled
});

test('existing games ignore the viewer; Liar\'s Dice state round-trips through JSON @quick', () => {
  const y = newGame('yahtzee', { players: ['A'] });
  expect(status(y, 0)).toEqual(status(y)); expect(status(y, null)).toEqual(status(y)); expect(redact(y, 0)).toEqual(y);
  const s = rollAll(game(), [[4, 4, 6], [4, 2, 1]]), frozen = JSON.stringify(s);
  act(s, { type: 'bid', quantity: 1, face: 2 }); expect(JSON.stringify(s)).toBe(frozen);
  expect(status(JSON.parse(frozen), 1)).toEqual(status(s, 1));
});
