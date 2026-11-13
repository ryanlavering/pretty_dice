// Craps engine (PD-142.7): fixed dice, exact bankroll arithmetic. Start bankroll 500, min bet 5, odds max 3x.
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, suggest, result, scorecard } from '../games/index.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r; };
const bet = (s, kind, amount, extra = {}) => ok(s, { type: 'bet', kind, amount, ...extra }).state;
const roll = (s, a, b) => ok(s, { type: 'roll', values: [a, b] }).state;
const bank = (s, p = 0) => status(s).bankrolls[p];
const table = (players = ['A']) => newGame('craps', { players });

test('craps: come-out naturals and craps for pass and don\'t pass @quick', () => {
  expect(rollSpec(table())).toEqual({ slots: [0, 1], sides: [6, 6] });
  let s = roll(bet(table(), 'pass', 10), 3, 4);                 // 7 wins
  expect(bank(s)).toBe(510); expect(status(s)).toMatchObject({ stage: 'comeOut', point: null, bets: [] });
  s = roll(bet(s, 'pass', 10), 1, 1); expect(bank(s)).toBe(500);          // 2 loses
  s = roll(bet(s, 'dontPass', 10), 1, 2); expect(bank(s)).toBe(510);      // 3 wins for don't pass
  s = roll(bet(s, 'dontPass', 10), 6, 6); expect(bank(s)).toBe(510);      // 12 pushes
  s = roll(bet(s, 'dontPass', 10), 5, 6); expect(bank(s)).toBe(500);      // 11 loses for don't pass
});

test('craps: pass line makes the point with true-odds payout @quick', () => {
  let s = bet(table(), 'pass', 10);
  s = roll(s, 2, 2);
  expect(status(s)).toMatchObject({ stage: 'point', point: 4 });
  s = bet(s, 'passOdds', 20);
  expect(bank(s)).toBe(470);
  const r = ok(s, { type: 'roll', values: [1, 3] });
  expect(r.events.filter(e => e.type === 'payout').map(e => [e.kind, e.result, e.amount])).toEqual([['pass', 'win', 10], ['passOdds', 'win', 40]]);
  expect(bank(r.state)).toBe(550); expect(status(r.state)).toMatchObject({ stage: 'comeOut', bets: [] });
});

test('craps: seven-out loses pass and place, passes the dice to the next player @quick', () => {
  let s = table(['A', 'B']);
  s = bet(s, 'pass', 10); s = roll(s, 3, 3);
  s = bet(s, 'place', 12, { number: 8 });
  expect(bank(s)).toBe(478);
  const r = ok(s, { type: 'roll', values: [3, 4] });
  expect(r.events.map(e => e.type)).toEqual(['rolled', 'payout', 'payout', 'sevenOut', 'shooter']);
  expect(bank(r.state)).toBe(478); expect(status(r.state)).toMatchObject({ player: 1, stage: 'comeOut', bets: [] });
});

test('craps: place bets win and stay, pay 7:5 on the 5, and can be taken down; off on the come-out @quick', () => {
  let s = bet(table(), 'place', 10, { number: 5 });
  s = roll(s, 2, 3);                                           // come-out 5 is the point; the place bet was off, stays
  expect(bank(s)).toBe(490); expect(status(s).point).toBe(5); expect(status(s).bets).toHaveLength(1);
  s = roll(s, 4, 4);                                           // 8 is not ours
  s = bet(s, 'place', 10, { number: 9 });
  s = roll(s, 4, 5);                                           // 9 wins 7:5 = 14
  expect(bank(s)).toBe(494);   // 480 + 14 winnings; both stakes stay on the table
  expect(status(s).bets.map(b => b.number)).toEqual([5, 9]);
  const id = status(s).bets[1].id;
  s = ok(s, { type: 'removeBet', id }).state;
  expect(bank(s)).toBe(504); expect(status(s).bets).toHaveLength(1);
});

test('craps: field pays 1:1, double on 2 and 12, loses on 5-8, one roll only @quick', () => {
  const f = (a, b) => { const s = roll(bet(table(), 'field', 10), a, b); expect(status(s).bets).toEqual([]); return bank(s); };
  expect(f(1, 1)).toBe(520); expect(f(6, 6)).toBe(520); expect(f(1, 2)).toBe(510); expect(f(5, 6)).toBe(510); expect(f(4, 5)).toBe(510); expect(f(2, 2)).toBe(510);
  expect(f(2, 3)).toBe(490); expect(f(3, 3)).toBe(490); expect(f(3, 4)).toBe(490); expect(f(4, 4)).toBe(490);
});

test('craps: don\'t pass with lay odds wins on the seven @quick', () => {
  let s = roll(bet(table(), 'dontPass', 10), 2, 3);
  s = bet(s, 'dontPassOdds', 30);
  expect(bank(s)).toBe(460);
  s = roll(s, 3, 4);                                           // lay 5 pays 2:3 = 20
  expect(bank(s)).toBe(530);
  let t = bet(roll(bet(table(), 'dontPass', 10), 2, 3), 'dontPassOdds', 30);
  t = roll(t, 2, 3);                                           // the point is made: don't pass loses with its odds
  expect(bank(t)).toBe(460);
});

test('craps: bet validation @quick', () => {
  const s = table(), why = (st, a) => { const r = act(st, a); expect(r.ok).toBe(false); return r.error; };
  expect(why(s, { type: 'bet', kind: 'pass', amount: 1 })).toMatch(/Minimum/);
  expect(why(s, { type: 'bet', kind: 'pass', amount: 501 })).toMatch(/bankroll/);
  expect(why(s, { type: 'bet', kind: 'place', amount: 10, number: 7 })).toMatch(/Place/);
  expect(why(s, { type: 'bet', kind: 'passOdds', amount: 10 })).toMatch(/point/);
  expect(why(s, { type: 'bet', kind: 'sidebet', amount: 10 })).toMatch(/Unknown/);
  expect(why(bet(s, 'pass', 10), { type: 'bet', kind: 'pass', amount: 10 })).toMatch(/already/);
  let p = roll(bet(s, 'pass', 10), 2, 2);
  expect(why(p, { type: 'bet', kind: 'pass', amount: 10, player: 0 })).toMatch(/come-out/);
  expect(why(p, { type: 'bet', kind: 'passOdds', amount: 31 })).toMatch(/3x/);
  expect(why(p, { type: 'bet', kind: 'dontPassOdds', amount: 10 })).toMatch(/needs/);
  expect(why(p, { type: 'removeBet', id: 1 })).toMatch(/cannot be taken down/);
  expect(why(p, { type: 'removeBet', id: 99 })).toMatch(/No such/);
  expect(why(p, { type: 'roll', values: [0, 7] })).toMatch(/two values/);
});

test('craps: end cashes out open bets and ranks by bankroll; multi-player bets are independent @quick', () => {
  let s = table(['A', 'B']);
  s = bet(s, 'pass', 20); s = bet(s, 'dontPass', 50, { player: 1 });
  s = roll(s, 5, 6);                                           // 11: A wins 20, B loses 50
  expect(status(s).bankrolls).toEqual([520, 450]);
  s = bet(s, 'field', 5, { player: 1 }); s = bet(s, 'place', 30, { number: 6 });
  s = ok(s, { type: 'end' }).state;
  expect(status(s)).toMatchObject({ phase: 'over', bankrolls: [520, 450] });
  expect(result(s)).toEqual({ ranking: [{ player: 0, name: 'A', total: 520, rank: 1 }, { player: 1, name: 'B', total: 450, rank: 2 }], winners: [0] });
  expect(scorecard(s, 0).total).toBe(520);
  expect(act(s, { type: 'roll', values: [1, 1] }).ok).toBe(false);
});

test('craps: suggest lists the bets open to the shooter and state is plain JSON @quick', () => {
  const s = table(), open = st => suggest(st).filter(r => r.available).map(r => r.label);
  expect(open(s)).toEqual(['Pass line', "Don't pass", 'Field', 'Place 4', 'Place 5', 'Place 6', 'Place 8', 'Place 9', 'Place 10']);
  const p = roll(bet(s, 'pass', 10), 3, 3);
  expect(open(p)).toEqual(['Pass odds', 'Field', 'Place 4', 'Place 5', 'Place 6', 'Place 8', 'Place 9', 'Place 10']);
  const frozen = JSON.stringify(p); act(p, { type: 'roll', values: [1, 1] }); expect(JSON.stringify(p)).toBe(frozen);
  expect(status(JSON.parse(frozen))).toEqual(status(p));
});
