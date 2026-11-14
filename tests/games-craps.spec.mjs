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
  expect(act(s, { type: 'bet', kind: 'comeOdds', amount: 10, on: come.id }).error).toMatch(/already/);
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
  expect(act(bet(table(), 'hardway', 10, { number: 4 }), { type: 'bet', kind: 'hardway', amount: 10, number: 4 }).error).toMatch(/Already/);
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
  expect(act(bet(table(), 'bigSix', 10), { type: 'bet', kind: 'bigSix', amount: 10 }).ok).toBe(false);
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
  expect(act(table(), { type: 'bet', kind: 'horn', amount: 10 }).error).toMatch(/multiple of 4/);
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
