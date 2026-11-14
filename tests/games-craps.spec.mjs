// Craps engine (PD-142.7): fixed dice, exact bankroll arithmetic. Start bankroll 500, min bet 5, odds max 3x.
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, suggest, result, scorecard, listGames } from '../games/index.js';

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
  expect(bank(ok(bet(s, 'pass', 10), { type: 'bet', kind: 'pass', amount: 10 }).state)).toBe(480);   // a second pass bet adds to the first (see the units spec)
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

const ALL = ['Field', 'Place 4', 'Place 5', 'Place 6', 'Place 8', 'Place 9', 'Place 10', 'Hard 4', 'Hard 6', 'Hard 8', 'Hard 10', 'Big 6', 'Big 8',
  'Any seven', 'Any craps', 'Two (snake eyes)', 'Three', 'Eleven', 'Twelve (boxcars)', 'Horn'];
test('craps: suggest lists the bets open to the shooter, each with help text @quick', () => {
  const s = table(), open = st => suggest(st).filter(r => r.available).map(r => r.label);
  expect(open(s)).toEqual(['Pass line', "Don't pass", ...ALL]);
  const p = roll(bet(s, 'pass', 10), 3, 3);
  expect(open(p)).toEqual(['Come', "Don't come", 'Pass odds', ...ALL]);
  for (const r of suggest(p)) expect(r.help, r.kind).toMatch(/.{30}/);
  expect(suggest(p).map(r => r.kind)).toContain('comeOdds');      // a placeholder row explaining what it needs
  const frozen = JSON.stringify(p); act(p, { type: 'roll', values: [1, 1] }); expect(JSON.stringify(p)).toBe(frozen);
  expect(status(JSON.parse(frozen))).toEqual(status(p));
  expect(suggest(newGame('craps', { players: ['A', 'B'] }), 1).filter(r => r.available)).toHaveLength(2 + ALL.length);   // per-player view
});

// Pass line + point 6 (3,3) for a fresh 500 bankroll table: bankroll 490 afterwards.
const withPoint6 = (s = table()) => roll(bet(s, 'pass', 10), 3, 3);
const payouts = r => r.events.filter(e => e.type === 'payout').map(e => [e.kind, e.number, e.result, e.amount]);

test('craps: come bet wins on 7/11, loses on craps, otherwise moves to its own number @quick', () => {
  let s = bet(withPoint6(), 'come', 10);
  expect(bank(s)).toBe(480);
  expect(act(s, { type: 'bet', kind: 'comeOdds', amount: 10, on: 2 }).ok).toBe(false);
  let r = ok(s, { type: 'roll', values: [5, 6] });                                   // 11: come wins
  expect(payouts(r)).toEqual([['come', null, 'win', 10]]); expect(bank(r.state)).toBe(500);
  r = ok(s, { type: 'roll', values: [1, 1] });                                       // 2: come loses
  expect(payouts(r)).toEqual([['come', null, 'lose', -10]]); expect(bank(r.state)).toBe(480);
  r = ok(s, { type: 'roll', values: [2, 2] });                                       // 4: moves
  expect(r.events.find(e => e.type === 'comeMove')).toMatchObject({ number: 4 });
  expect(status(r.state).bets.find(b => b.kind === 'come')).toMatchObject({ number: 4 });
  expect(status(r.state)).toMatchObject({ stage: 'point', point: 6 });
});

test('come bet with odds pays true odds on its number; loses with odds on a 7 @quick', () => {
  let s = bet(withPoint6(), 'come', 10);
  s = roll(s, 2, 2);
  const come = status(s).bets.find(b => b.kind === 'come');
  expect(act(s, { type: 'bet', kind: 'comeOdds', amount: 31, on: come.id }).error).toMatch(/3x/);
  s = bet(s, 'comeOdds', 20, { on: come.id });
  expect(bank(s)).toBe(460);
  expect(act(s, { type: 'bet', kind: 'comeOdds', amount: 11, on: come.id }).error).toMatch(/3x/);   // 20 + 11 is over the 30 limit
  const win = ok(s, { type: 'roll', values: [1, 3] });
  expect(payouts(win)).toEqual([['come', 4, 'win', 10], ['comeOdds', 4, 'win', 40]]);
  expect(bank(win.state)).toBe(540);
  const lose = ok(s, { type: 'roll', values: [3, 4] });                              // seven out: pass, come and odds lose
  expect(payouts(lose).map(p => p[2])).toEqual(['lose', 'lose', 'lose']); expect(bank(lose.state)).toBe(460);
});

test('craps: don\'t come with lay odds wins on a seven; loses when its number rolls @quick', () => {
  let s = bet(withPoint6(), 'dontCome', 10);
  s = roll(s, 5, 5);                                                                  // moves to 10
  const dc = status(s).bets.find(b => b.kind === 'dontCome');
  s = bet(s, 'dontComeOdds', 30, { on: dc.id });
  expect(bank(s)).toBe(450);
  const seven = ok(s, { type: 'roll', values: [3, 4] });                              // pass loses, don't come wins 10, lay 1:2 on 10 pays 15
  expect(payouts(seven)).toEqual([['pass', null, 'lose', -10], ['dontCome', 10, 'win', 10], ['dontComeOdds', 10, 'win', 15]]);
  expect(bank(seven.state)).toBe(515);
  const hit = ok(s, { type: 'roll', values: [4, 6] });
  expect(payouts(hit)).toEqual([['dontCome', 10, 'lose', -10], ['dontComeOdds', 10, 'lose', -30]]);
  // don't come: 12 pushes, 2 and 3 win, 7 and 11 lose on its first roll
  const dcFirst = t => bank(roll(bet(withPoint6(), 'dontCome', 10), t[0], t[1]));
  expect([dcFirst([6, 6]), dcFirst([1, 1]), dcFirst([1, 2]), dcFirst([4, 3]), dcFirst([5, 6])]).toEqual([490, 500, 500, 480, 480]);
});

test('craps: come odds are off on the come-out roll and are returned @quick', () => {
  let s = roll(bet(table(), 'pass', 10), 2, 2);                                       // point 4
  s = bet(s, 'come', 10); s = roll(s, 3, 3);                                          // come moves to 6
  const come = status(s).bets.find(b => b.kind === 'come');
  s = bet(s, 'comeOdds', 15, { on: come.id });
  expect(bank(s)).toBe(465);
  s = roll(s, 1, 3);                                                                  // point made: pass wins; come-out stage now
  expect(bank(s)).toBe(485); expect(status(s).stage).toBe('comeOut');
  const r = ok(s, { type: 'roll', values: [3, 3] });                                  // come wins on 6; odds off: returned
  expect(payouts(r)).toEqual([['come', 6, 'win', 10], ['comeOdds', 6, 'push', 0]]);
  expect(bank(r.state)).toBe(520);
  const seven = ok(s, { type: 'roll', values: [3, 4] });                              // come loses to the 7 even on the come-out, odds returned
  expect(payouts(seven)).toEqual([['come', 6, 'lose', -10], ['comeOdds', 6, 'push', 0]]); expect(bank(seven.state)).toBe(500);
});

test('craps: hardways pay 7:1 and 9:1, lose on the easy way or a 7, are off on the come-out @quick', () => {
  let s = roll(bet(table(), 'hardway', 10, { number: 4 }), 2, 2);                     // come-out roll of hard 4: bet is off
  expect(bank(s)).toBe(490); expect(status(s).bets).toHaveLength(1); expect(status(s).point).toBe(4);
  const hit = ok(s, { type: 'roll', values: [2, 2] });                                // hard 4 again (also the point)
  expect(payouts(hit)).toEqual([['hardway', 4, 'win', 70]]); expect(bank(hit.state)).toBe(560); expect(status(hit.state).bets).toHaveLength(1);
  const easy = ok(bet(withPoint6(), 'hardway', 10, { number: 6 }), { type: 'roll', values: [1, 5] });   // 6 the easy way: hardway loses, point made
  expect(payouts(easy)).toEqual([['pass', null, 'win', 10], ['hardway', 6, 'lose', -10]]); expect(bank(easy.state)).toBe(500);
  let h8 = bet(withPoint6(), 'hardway', 10, { number: 8 });
  h8 = roll(h8, 4, 4); expect(bank(h8)).toBe(570);                                     // 9:1
  const seven = ok(h8, { type: 'roll', values: [3, 4] });
  expect(payouts(seven)).toEqual([['pass', null, 'lose', -10], ['hardway', 8, 'lose', -10]]); expect(status(seven.state).bets).toEqual([]);
  expect(act(withPoint6(), { type: 'bet', kind: 'hardway', amount: 10, number: 5 }).error).toMatch(/4, 6, 8 or 10/);
});

test('craps: big 6 and big 8 pay 1:1, stay up, lose on a 7, off on the come-out @quick', () => {
  let s = roll(bet(table(), 'pass', 10), 2, 3);                                       // point 5
  s = bet(bet(s, 'bigSix', 10), 'bigEight', 20);
  expect(bank(s)).toBe(460);
  s = roll(s, 4, 4); expect(bank(s)).toBe(480);                                       // big 8 wins 20
  s = roll(s, 1, 5); expect(bank(s)).toBe(490);                                       // big 6 wins 10
  expect(status(s).bets.map(b => b.kind)).toEqual(['pass', 'bigSix', 'bigEight']);
  const seven = ok(s, { type: 'roll', values: [3, 4] });
  expect(payouts(seven).map(p => p[2])).toEqual(['lose', 'lose', 'lose']); expect(bank(seven.state)).toBe(490);
  let c = roll(bet(table(), 'bigSix', 10), 3, 3);                                     // come-out 6: off
  expect(bank(c)).toBe(490); expect(status(c).bets).toHaveLength(1);
});

const DICE = { 2: [1, 1], 3: [1, 2], 4: [2, 2], 5: [2, 3], 6: [3, 3], 7: [3, 4], 8: [4, 4], 9: [4, 5], 10: [5, 5], 11: [5, 6], 12: [6, 6] };
test('craps: one-roll props pay 4:1, 7:1, 30:1, 15:1, 15:1, 30:1 and the horn splits four ways @quick', () => {
  const WIN = { anySeven: { 7: 40 }, anyCraps: { 2: 70, 3: 70, 12: 70 }, two: { 2: 300 }, three: { 3: 150 }, eleven: { 11: 150 }, twelve: { 12: 300 } };
  const HORN = { 2: 135, 12: 135, 3: 60, 11: 60 };                                    // 20 on the horn = 5 on each of 2, 3, 11, 12
  for (let t = 2; t <= 12; t++) {
    for (const [kind, wins] of Object.entries(WIN)) {
      const r = ok(bet(table(), kind, 10), { type: 'roll', values: DICE[t] });
      expect(bank(r.state), `${kind} on ${t}`).toBe(500 + (wins[t] ?? -10)); expect(status(r.state).bets, kind).toEqual([]);
    }
    const h = ok(bet(table(), 'horn', 20), { type: 'roll', values: DICE[t] });
    expect(bank(h.state), `horn on ${t}`).toBe(500 + (HORN[t] ?? -20));
  }
  expect(act(table(), { type: 'bet', kind: 'horn', amount: 10 }).error).toMatch(/multiples of 4/);
  const p = bet(table(), 'anySeven', 10);
  expect(act(p, { type: 'removeBet', id: 1 }).error).toMatch(/cannot be taken down/);
});

test('craps: no betting while the dice are rolling @quick', () => {
  let s = bet(table(), 'field', 10);
  expect(status(s)).toMatchObject({ rolling: false, canBet: true, canRoll: true });
  s = ok(s, { type: 'rollStart' }).state;
  expect(status(s)).toMatchObject({ rolling: true, canBet: false, canRoll: false, message: 'Dice are rolling' });
  for (const a of [{ type: 'bet', kind: 'field', amount: 10 }, { type: 'removeBet', id: 1 }, { type: 'end' }, { type: 'rollStart' }]) expect(act(s, a).ok, JSON.stringify(a)).toBe(false);
  expect(act(s, { type: 'bet', kind: 'field', amount: 10 }).error).toMatch(/rolling/);
  expect(suggest(s).every(r => !r.available)).toBe(true);
  const c = ok(s, { type: 'rollCancel' }).state;
  expect(status(c).canBet).toBe(true); expect(act(c, { type: 'rollCancel' }).ok).toBe(false);
  const done = roll(s, 3, 4);                                                         // the settled roll clears the flag
  expect(status(done)).toMatchObject({ rolling: false, canBet: true }); expect(bank(done)).toBe(490);
  expect(act(done, { type: 'bet', kind: 'field', amount: 10 }).ok).toBe(true);
  expect(roll(table(), 3, 4)).toBeTruthy();                                           // rolling without rollStart still works
});

test('craps: taking down and refusing bets, validation of the new kinds @quick', () => {
  let s = bet(withPoint6(), 'dontCome', 10);
  s = roll(s, 5, 5);
  const dc = status(s).bets.find(b => b.kind === 'dontCome');
  s = bet(s, 'dontComeOdds', 20, { on: dc.id });
  expect(bank(s)).toBe(460);
  s = ok(s, { type: 'removeBet', id: dc.id }).state;                                  // don't come comes down and takes its lay odds with it
  expect(bank(s)).toBe(490); expect(status(s).bets.map(b => b.kind)).toEqual(['pass']);
  s = bet(s, 'hardway', 10, { number: 8 });
  const hw = status(s).bets.at(-1);
  expect(bank(ok(s, { type: 'removeBet', id: hw.id }).state)).toBe(490);
  const why = (st, a) => { const r = act(st, a); expect(r.ok, JSON.stringify(a)).toBe(false); return r.error; };
  const c = bet(s, 'come', 10); const come = status(c).bets.at(-1);
  expect(why(c, { type: 'removeBet', id: come.id })).toMatch(/cannot be taken down/);
  expect(why(c, { type: 'bet', kind: 'comeOdds', amount: 10, on: come.id })).toMatch(/no number/);
  expect(why(c, { type: 'bet', kind: 'comeOdds', amount: 10, on: 1 })).toMatch(/behind one of your come/);
  expect(why(table(), { type: 'bet', kind: 'come', amount: 10 })).toMatch(/need a point/);
  expect(why(table(), { type: 'bet', kind: 'dontCome', amount: 10 })).toMatch(/need a point/);
});

test('craps: a come and a don\'t come bet travel to the same number and settle opposite ways @quick', () => {
  let s = bet(bet(withPoint6(), 'come', 10), 'dontCome', 10);                         // two come bets travel together
  s = roll(s, 4, 4);                                                                  // both move to 8
  expect(status(s).bets.filter(b => b.number === 8).map(b => b.kind)).toEqual(['come', 'dontCome']);
  const r = ok(s, { type: 'roll', values: [4, 4] });                                  // 8 again: come wins, don't come loses
  expect(payouts(r)).toEqual([['come', 8, 'win', 10], ['dontCome', 8, 'lose', -10]]);
  expect(bank(r.state)).toBe(490);   // 500 - 10 pass - 10 - 10 + 20 back from the come bet
});

// ---- Bet units (PD-142.33): every stake is a multiple of its unit so every payout is whole chips ----
import { unitFor } from '../games/craps.js';
const why = (st, a) => { const r = act(st, a); expect(r.ok, JSON.stringify(a)).toBe(false); expect(r.state).toBe(st); return r.error; };
const row = (st, kind, extra = {}) => suggest(st).find(r => r.kind === kind && Object.entries(extra).every(([k, v]) => r[k] === v));
const at = (point, s = table()) => roll(bet(s, 'pass', 20), ...DICE[point]);   // 20 on the line, bankroll 480, point set

test('craps units: the unit of every bet follows its pay table; chips are 1, 5, 25, 100 @quick', () => {
  expect([4, 5, 6, 8, 9, 10].map(n => unitFor('place', n))).toEqual([5, 5, 6, 6, 5, 5]);
  expect([4, 5, 6, 8, 9, 10].map(n => unitFor('passOdds', n))).toEqual([1, 2, 5, 5, 2, 1]);
  expect([4, 5, 6, 8, 9, 10].map(n => unitFor('comeOdds', n))).toEqual([1, 2, 5, 5, 2, 1]);
  expect([4, 5, 6, 8, 9, 10].map(n => unitFor('dontPassOdds', n))).toEqual([2, 3, 6, 6, 3, 2]);
  expect([4, 5, 6, 8, 9, 10].map(n => unitFor('dontComeOdds', n))).toEqual([2, 3, 6, 6, 3, 2]);
  expect(unitFor('horn')).toBe(4);
  for (const k of ['pass', 'dontPass', 'come', 'dontCome', 'field', 'bigSix', 'bigEight', 'anySeven', 'anyCraps', 'two', 'three', 'eleven', 'twelve']) expect(unitFor(k), k).toBe(1);
  expect([4, 6, 8, 10].map(n => unitFor('hardway', n))).toEqual([1, 1, 1, 1]);
  expect(listGames().find(g => g.id === 'craps').chips).toEqual([1, 5, 25, 100]);
  expect(status(table()).chips).toEqual([1, 5, 25, 100]);
});

test('craps units: suggest rows carry unit, minAmount, maxAmount and the pay ratio @quick', () => {
  const s = table();
  expect(row(s, 'place', { number: 6 })).toMatchObject({ unit: 6, minAmount: 6, maxAmount: 498, pays: '7:6', available: true, add: false, current: 0 });
  expect(row(s, 'place', { number: 4 })).toMatchObject({ unit: 5, minAmount: 5, maxAmount: 500, pays: '9:5' });
  expect(row(s, 'horn')).toMatchObject({ unit: 4, minAmount: 8, maxAmount: 500 });          // min bet 5 rounds up to a multiple of 4
  expect(row(s, 'hardway', { number: 8 })).toMatchObject({ unit: 1, minAmount: 5, pays: '9:1' });
  expect(row(s, 'field').pays).toMatch(/1:1/); expect(row(s, 'twelve').pays).toBe('30:1');
  const p = at(5);                                                                           // point 5, 20 on the pass line, 480 left
  expect(row(p, 'passOdds')).toMatchObject({ unit: 2, minAmount: 2, maxAmount: 60, pays: '3:2', available: true });   // 3x20 = 60
  const low = newGame('craps', { players: ['A'], options: { bankroll: 50, minBet: 5 } });
  expect(row(low, 'place', { number: 6 }).maxAmount).toBe(48);                               // snapped down to a multiple of 6
  const poor = newGame('craps', { players: ['A'], options: { bankroll: 5, minBet: 5 } });
  expect(row(poor, 'place', { number: 6 })).toMatchObject({ available: false, maxAmount: 0 });   // 5 chips cannot cover the 6 minimum
  expect(row(poor, 'field')).toMatchObject({ available: true, maxAmount: 5 });
});

test('craps units: stakes that do not pay whole chips are rejected with the multiples to use @quick', () => {
  const s = table();
  expect(why(s, { type: 'bet', kind: 'place', number: 6, amount: 10 })).toMatch(/pays 7:6, so bet in multiples of 6 \(6, 12, 18/);
  expect(why(s, { type: 'bet', kind: 'place', number: 8, amount: 13 })).toMatch(/multiples of 6/);
  for (const n of [4, 5, 9, 10]) expect(why(s, { type: 'bet', kind: 'place', number: n, amount: 7 })).toMatch(/multiples of 5/);
  expect(bank(bet(s, 'place', 18, { number: 6 }))).toBe(482);
  expect(bank(bet(s, 'place', 15, { number: 5 }))).toBe(485);
  const pass5 = at(5), pass6 = at(6), pass4 = at(4);
  expect(why(pass5, { type: 'bet', kind: 'passOdds', amount: 5 })).toMatch(/pays 3:2, so bet in multiples of 2/);
  expect(why(pass6, { type: 'bet', kind: 'passOdds', amount: 12 })).toMatch(/pays 6:5, so bet in multiples of 5/);
  expect(bank(bet(pass5, 'passOdds', 10))).toBe(470); expect(bank(bet(pass6, 'passOdds', 15))).toBe(465); expect(bank(bet(pass4, 'passOdds', 7))).toBe(473);
  const dp = point => roll(bet(table(), 'dontPass', 20), ...DICE[point]);
  expect(why(dp(4), { type: 'bet', kind: 'dontPassOdds', amount: 5 })).toMatch(/pays 1:2, so bet in multiples of 2/);
  expect(why(dp(5), { type: 'bet', kind: 'dontPassOdds', amount: 10 })).toMatch(/pays 2:3, so bet in multiples of 3/);
  expect(why(dp(6), { type: 'bet', kind: 'dontPassOdds', amount: 10 })).toMatch(/pays 5:6, so bet in multiples of 6/);
  expect(bank(bet(dp(6), 'dontPassOdds', 18))).toBe(462);
  expect(why(s, { type: 'bet', kind: 'horn', amount: 10 })).toMatch(/multiples of 4 \(8, 12, 16/);
  expect(why(s, { type: 'bet', kind: 'pass', amount: 2.5 })).toMatch(/whole number/);
  expect(why(s, { type: 'bet', kind: 'pass', amount: 3 })).toMatch(/Minimum bet is 5/);
  expect(why(s, { type: 'bet', kind: 'place', number: 6, amount: 3 })).toMatch(/multiples of 6/);
  expect(why(s, { type: 'bet', kind: 'place', number: 6, amount: 504 })).toMatch(/bankroll/);
  const c = roll(bet(at(6), 'come', 10), 2, 3);                                              // the come bet travels to 5: unit 2
  const come = status(c).bets.find(b => b.kind === 'come');
  expect(come.number).toBe(5);
  expect(why(c, { type: 'bet', kind: 'comeOdds', amount: 5, on: come.id })).toMatch(/multiples of 2/);
});

test('craps units: every legal stake pays a whole number of chips, exactly the pay table @quick', () => {
  const PAY = { place: { 4: [9, 5], 5: [7, 5], 6: [7, 6], 8: [7, 6], 9: [7, 5], 10: [9, 5] }, odds: { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5] }, lay: { 4: [1, 2], 10: [1, 2], 5: [2, 3], 9: [2, 3], 6: [5, 6], 8: [5, 6] } };
  for (const n of [4, 5, 6, 8, 9, 10]) for (let k = 1; k <= 6; k++) {
    const pu = unitFor('place', n), pamt = Math.ceil(6 / pu) * pu * k;                          // a multiple of the unit, at least the minimum
    const placed = bet(at(n === 5 ? 6 : 5), 'place', pamt, { number: n });                       // point 5 (or 6), then a place bet on n
    const pay = ok(placed, { type: 'roll', values: DICE[n] }).events.find(e => e.type === 'payout' && e.kind === 'place');
    const [pn, pd] = PAY.place[n];
    expect((pamt * pn) % pd, `place ${n} ${pamt}`).toBe(0);
    expect(pay.amount, `place ${n} ${pamt}`).toBe(pamt * pn / pd);
    const ou = unitFor('passOdds', n), oamt = ou * k * (n === 6 || n === 8 ? 1 : 2);
    let o = roll(bet(table(), 'pass', 100), ...DICE[n]);                                          // point n with 100 on the line
    o = roll(bet(o, 'passOdds', oamt), ...DICE[n]);
    const [on, od] = PAY.odds[n]; expect((oamt * on) % od).toBe(0);
    expect(bank(o), `pass odds ${n} ${oamt}`).toBe(500 + 100 + oamt * on / od);
    const lu = unitFor('dontPassOdds', n), lamt = lu * k * 2;
    let l = roll(bet(table(), 'dontPass', 100), ...DICE[n]);
    l = roll(bet(l, 'dontPassOdds', lamt), 3, 4);                                                 // seven: lay odds win
    const [ln, ld] = PAY.lay[n]; expect((lamt * ln) % ld).toBe(0);
    expect(bank(l), `lay odds ${n} ${lamt}`).toBe(500 + 100 + lamt * ln / ld);
  }
});

test('craps units: bets can be added to by the unit and reduced by the unit where the rules allow @quick', () => {
  let s = bet(table(), 'place', 12, { number: 6 });
  const id = status(s).bets[0].id;
  const add = ok(s, { type: 'bet', kind: 'place', number: 6, amount: 6 });
  expect(add.events).toEqual([{ type: 'betPlaced', player: 0, id, kind: 'place', number: 6, on: null, amount: 6, total: 18, added: true }]);
  s = add.state;
  expect(status(s).bets).toHaveLength(1); expect(status(s).bets[0]).toMatchObject({ amount: 18, unit: 6, canReduce: true, canRemove: true }); expect(bank(s)).toBe(482);
  expect(why(s, { type: 'bet', kind: 'place', number: 6, amount: 5 })).toMatch(/multiples of 6/);
  expect(row(s, 'place', { number: 6 })).toMatchObject({ add: true, id, current: 18, unit: 6, minAmount: 6 });
  const red = ok(s, { type: 'removeBet', id, amount: 6 });
  expect(red.events).toEqual([{ type: 'betRemoved', player: 0, id, kind: 'place', amount: 6, partial: true, remaining: 12 }]);
  expect(bank(red.state)).toBe(488); expect(status(red.state).bets[0].amount).toBe(12);
  expect(why(s, { type: 'removeBet', id, amount: 5 })).toMatch(/multiples of 6/);
  expect(why(s, { type: 'removeBet', id, amount: 19 })).toMatch(/Only 18/);
  const win = ok(bet(at(5), 'place', 18, { number: 6 }), { type: 'roll', values: [3, 3] });
  expect(win.events.find(e => e.kind === 'place')).toMatchObject({ result: 'win', amount: 21 });   // 18 pays 7:6 = 21 chips exactly
  const six = status(bet(table(), 'place', 6, { number: 6 })).bets[0];
  expect(six).toMatchObject({ canRemove: true, canReduce: false });                                    // nothing above the minimum left to take off
  const strict = newGame('craps', { players: ['A'], options: { minBet: 10 } });                         // unit 5, minimum 10
  const t = bet(strict, 'place', 15, { number: 5 }), tid = status(t).bets[0].id;
  expect(why(t, { type: 'removeBet', id: tid, amount: 10 })).toMatch(/least left on this bet is 10/);
  expect(bank(ok(t, { type: 'removeBet', id: tid, amount: 5 }).state)).toBe(490);
  expect(bank(ok(t, { type: 'removeBet', id: tid }).state)).toBe(500);                                  // the whole bet always comes down
});

test('craps units: line bets add only before a point and cannot be reduced; odds add up to the limit and reduce freely @quick', () => {
  let s = bet(table(), 'pass', 10);
  const more = ok(s, { type: 'bet', kind: 'pass', amount: 5 }); s = more.state;
  expect(more.events[0]).toMatchObject({ added: true, total: 15 }); expect(status(s).bets).toHaveLength(1); expect(bank(s)).toBe(485);
  s = roll(s, 2, 2);                                                                                    // point 4: line bets are locked
  expect(why(s, { type: 'bet', kind: 'pass', amount: 5 })).toMatch(/come-out/);
  const pass = status(s).bets[0];
  expect(pass).toMatchObject({ canRemove: false, canReduce: false });
  expect(why(s, { type: 'removeBet', id: pass.id, amount: 5 })).toMatch(/only be taken down whole/);
  expect(why(s, { type: 'removeBet', id: pass.id })).toMatch(/cannot be taken down/);
  s = bet(s, 'passOdds', 30);                                                                           // limit 3 x 15 = 45
  s = bet(s, 'passOdds', 15);
  expect(status(s).bets.find(b => b.kind === 'passOdds')).toMatchObject({ amount: 45, number: 4 });
  expect(why(s, { type: 'bet', kind: 'passOdds', amount: 1 })).toMatch(/limited to 3x the line bet \(45\)/);
  expect(row(s, 'passOdds')).toMatchObject({ add: true, current: 45, maxAmount: 0, available: false });
  const odds = status(s).bets.find(b => b.kind === 'passOdds');
  expect(odds).toMatchObject({ canRemove: true, canReduce: true });
  const less = ok(s, { type: 'removeBet', id: odds.id, amount: 20 }).state;
  expect(status(less).bets.find(b => b.kind === 'passOdds').amount).toBe(25);
  expect(row(less, 'passOdds')).toMatchObject({ maxAmount: 20, minAmount: 1 });
  const five = roll(bet(table(), 'pass', 10), 2, 3), five1 = bet(five, 'passOdds', 10);
  expect(why(five1, { type: 'removeBet', id: status(five1).bets[1].id, amount: 3 })).toMatch(/multiples of 2/);   // odds on a 5: unit 2
  // don't pass: whole take-down only, once a point is set
  const dp = roll(bet(table(), 'dontPass', 20), 2, 3), dpb = status(dp).bets[0];
  expect(dpb).toMatchObject({ canRemove: true, canReduce: false });
  expect(why(dp, { type: 'removeBet', id: dpb.id, amount: 5 })).toMatch(/only be taken down whole/);
  expect(bank(ok(dp, { type: 'removeBet', id: dpb.id }).state)).toBe(500);
  // hardway and big bets press by one chip; nothing changes while the dice roll
  const hw = bet(bet(table(), 'hardway', 10, { number: 6 }), 'hardway', 5, { number: 6 });
  expect(status(hw).bets).toMatchObject([{ kind: 'hardway', amount: 15 }]);
  expect(status(bet(bet(table(), 'bigSix', 10), 'bigSix', 5)).bets[0].amount).toBe(15);
  const busy = ok(hw, { type: 'rollStart' }).state;
  expect(why(busy, { type: 'removeBet', id: 1, amount: 5 })).toMatch(/rolling/);
  expect(status(busy).bets[0]).toMatchObject({ canRemove: false, canReduce: false });
});
