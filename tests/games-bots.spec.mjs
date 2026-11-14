// Computer opponents (PD-142.24): deterministic bots for every game, no illegal moves, no peeking in Liar's Dice.
import { test, expect } from '@playwright/test';
import { newGame, status, act, botMove, runBots, result } from '../games/index.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r.state; };
const roll = (s, v) => ok(s, { type: 'roll', values: v });

test('bots are seats on a game; botTurn follows the seat; humans and finished games get no move @quick', () => {
  expect(() => newGame('pig', { players: ['A', 'B'], bots: [2] })).toThrow(/seat/);
  const s = newGame('pig', { players: ['Me', 'Bot'], bots: [1] });
  expect(status(s)).toMatchObject({ bots: [1], botTurn: false, player: 0 });
  expect(botMove(s)).toBeNull();                                      // a human's turn
  expect(botMove(newGame('pig', { players: ['A', 'B'] }))).toBeNull();   // no bots at all
  expect(runBots(s).actions).toEqual([]);
  const after = ok(roll(s, [3]), { type: 'bank' });                   // the human banks: now the bot plays until the human is up
  expect(status(after)).toMatchObject({ player: 1, botTurn: true });
  const r = runBots(after, { seed: 5 });
  expect(status(r.state)).toMatchObject({ player: 0, botTurn: false }); expect(r.actions.length).toBeGreaterThan(0);
  expect(botMove(runBots(newGame('pig', { players: ['A', 'B'], bots: [0, 1] }), { seed: 1 }).state)).toBeNull();   // game over
});

test('same state and seed give the same move and the same game; other seeds differ @quick', () => {
  const s = newGame('yahtzee', { players: ['Bot'], bots: [0] });
  expect(botMove(s, { seed: 3 })).toEqual(botMove(s, { seed: 3 }));
  const a = runBots(s, { seed: 11 }), b = runBots(s, { seed: 11 }), c = runBots(s, { seed: 12 });
  expect(a.actions).toEqual(b.actions); expect(a.state).toEqual(b.state);
  expect(c.actions).not.toEqual(a.actions);
  const l = newGame('liarsdice', { players: ['A', 'B', 'C'], bots: [0, 1, 2] });
  expect(runBots(l, { seed: 4 }).actions).toEqual(runBots(l, { seed: 4 }).actions);
});

test('every game plays through bot against bot with legal moves only @quick', () => {
  const setups = [['yahtzee', ['A', 'B'], [0, 1]], ['farkle', ['A', 'B', 'C'], [0, 1, 2]], ['pig', ['A', 'B'], [0, 1]], ['shutbox', ['A', 'B'], [0, 1]],
    ['shipcaptain', ['A', 'B'], [0, 1]], ['bunco', ['A', 'B'], [0, 1]], ['liarsdice', ['A', 'B', 'C', 'D'], [0, 1, 2, 3]]];
  for (const [id, players, bots] of setups) {
    for (const seed of [1, 2, 3]) {
      const r = runBots(newGame(id, { players, bots }), { seed });          // throws on an illegal move
      expect(status(r.state).phase, `${id} seed ${seed}`).toBe('over');
      expect(result(r.state).winners.length).toBeGreaterThan(0);
    }
  }
});

test('Yahtzee bot: scores obvious hands, keeps the sixes, averages well over 200 @quick', () => {
  let s = newGame('yahtzee', { players: ['Bot'], bots: [0] });
  expect(botMove(s)).toEqual({ type: 'roll' });
  expect(botMove(roll(s, [1, 2, 3, 4, 5]))).toEqual({ type: 'score', category: 'largeStraight' });
  let k = roll(s, [6, 6, 6, 6, 2]);
  const moves = [];
  for (let i = 0; i < 8; i++) { const m = botMove(k); moves.push(m); if (m.type === 'roll') break; k = ok(k, m); }
  expect(moves.at(-1)).toEqual({ type: 'roll' });
  expect(status(k).held).toEqual([true, true, true, true, false]);
  const totals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(seed => { const r = runBots(newGame('yahtzee', { players: ['Bot'], bots: [0] }), { seed }); return result(r.state).ranking[0].total; });
  expect(totals.reduce((a, b) => a + b, 0) / totals.length).toBeGreaterThan(200);
});

test('Pig and Farkle bots bank at their thresholds and take the most points @quick', () => {
  const pig = (...rolls) => rolls.reduce((st, v) => roll(st, [v]), newGame('pig', { players: ['Bot'], bots: [0] }));
  expect(botMove(pig(6, 6, 6, 6))).toEqual({ type: 'bank' });         // 24
  expect(botMove(pig(6, 6))).toEqual({ type: 'roll' });               // 12
  expect(botMove(pig(5, 5, 5, 5))).toEqual({ type: 'bank' });         // exactly 20
  let f = roll(newGame('farkle', { players: ['Bot'], bots: [0], options: { opening: 0 } }), [1, 1, 1, 2, 3, 4]);
  expect(botMove(f)).toEqual({ type: 'score', dice: [0, 1, 2] });
  f = ok(f, botMove(f));
  expect(botMove(f)).toEqual({ type: 'bank' });                       // 1000 with 3 dice left
  const g = ok(roll(newGame('farkle', { players: ['Bot'], bots: [0], options: { opening: 0 } }), [1, 2, 2, 3, 4, 6]), { type: 'score', dice: [0] });
  expect(botMove(g)).toEqual({ type: 'roll' });                       // 100 with 5 dice left: keep rolling
});

test('Shut the Box, Ship Captain and Crew and Bunco bots @quick', () => {
  const sb = roll(newGame('shutbox', { players: ['Bot'], bots: [0] }), [3, 4]);
  expect(botMove(sb)).toEqual({ type: 'score', tiles: [7] });         // the highest tile
  const ship = n => roll(newGame('shipcaptain', { players: ['Bot'], bots: [0] }), n);
  expect(botMove(ship([6, 5, 4, 6, 5]))).toEqual({ type: 'bank' });   // cargo 11
  expect(botMove(ship([6, 5, 4, 2, 3]))).toEqual({ type: 'roll' });   // cargo 5
  expect(botMove(newGame('bunco', { players: ['Bot'], bots: [0] }))).toEqual({ type: 'roll' });
});

test('Craps bot bets the pass line, then full odds, then rolls when it is the shooter @quick', () => {
  let s = newGame('craps', { players: ['Me', 'Bot'], bots: [1] });
  expect(botMove(s)).toEqual({ type: 'bet', kind: 'pass', amount: 10, player: 1 });
  const r = runBots(s, { seed: 1 }); expect(r.actions).toEqual([{ type: 'bet', kind: 'pass', amount: 10, player: 1 }]);   // human is the shooter: stop
  s = roll(r.state, [3, 3]);                                          // point 6
  expect(botMove(s)).toEqual({ type: 'bet', kind: 'passOdds', amount: 30, player: 1 });
  s = runBots(s).state;
  expect(botMove(s)).toBeNull();
  const solo = newGame('craps', { players: ['Bot'], bots: [0] });
  expect(botMove(solo).kind).toBe('pass');
  const played = runBots(solo, { seed: 2, maxActions: 40 });
  expect(played.actions.some(a => a.type === 'roll')).toBe(true);
  expect(status(played.state).bankrolls[0]).toBeGreaterThanOrEqual(0);
});

test('Liar\'s Dice bot never peeks: its move ignores other players\' dice @quick', () => {
  const rollAll = (s, hands) => hands.reduce((st, h) => roll(st, h), s);
  const mk = hands => rollAll(newGame('liarsdice', { players: ['A', 'B'], bots: [0, 1], options: { dice: 3 } }), hands);
  const a = mk([[6, 6, 6], [1, 2, 3]]), b = mk([[6, 6, 6], [5, 5, 5]]);   // only the other cup differs
  for (const seed of [0, 1, 2, 3, 4, 5]) expect(botMove(a, { seed })).toEqual(botMove(b, { seed }));
  expect(botMove(a)).toMatchObject({ type: 'bid', face: 6 });             // opens on the face it holds
  // a bot challenges an absurd bid, and only the acting seat gets a move
  const hi = ok(a, { type: 'bid', quantity: 6, face: 3 });
  expect(botMove(hi)).toEqual({ type: 'challenge' });
  const human = newGame('liarsdice', { players: ['Me', 'Bot'], bots: [1], options: { dice: 3 } });
  expect(botMove(human)).toBeNull();                                    // the human rolls first
  const ready = ok(rollAll(human, [[2, 2, 2], [4, 4, 4]]), { type: 'bid', quantity: 1, face: 2 });
  expect(botMove(ready)).toMatchObject({ type: expect.stringMatching(/bid|challenge/) });
  const revealed = ok(ready, { type: 'challenge' });
  expect(status(revealed).phase).toBe('reveal'); expect(botMove(revealed)).toBeNull();   // a human must press Next
});
