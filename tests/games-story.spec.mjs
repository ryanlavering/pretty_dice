// Story Dice engine (PD-160 spike): pure node tests.
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, scorecard, result, listGames, botMove } from '../games/index.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r.state; };
const mk = (opts = {}, players = ['A', 'B']) => newGame('story', { players, options: { dice: 4, rounds: 2, ...opts } });

test('story: listed with options, defaults, solo allowed, bots allowed @quick', () => {
  const g = listGames().find(x => x.id === 'story'); expect(g.name).toBe('Story Dice'); expect(g.minPlayers).toBe(1); expect(g.noBots).toBeUndefined();
  expect(g.options.map(o => o.id)).toEqual(['dice', 'sides', 'rounds', 'seed', 'hints', 'packs']);
  const s = newGame('story', { players: ['Me'] }); expect(s.options.dice).toBe(5); expect(s.options.sides).toBe(12); expect(s.options.packs).toEqual(['noto']);
});

test('story: roll -> arrange (partial then full) -> rate -> next player; points 0/3/5/7/10 @quick', () => {
  let s = mk(); expect(status(s).phase).toBe('roll'); expect(rollSpec(s)).toEqual({ slots: [0, 1, 2, 3], sides: [12, 12, 12, 12] });
  expect(act(s, { type: 'rate', rating: 'good' }).error).toMatch(/order/); expect(act(s, { type: 'arrange', order: [0, 1, 2, 3] }).error).toMatch(/Roll first/);
  expect(act(s, { type: 'roll', values: [1, 2, 3] }).error).toMatch(/Expected 4/); expect(act(s, { type: 'roll', values: [1, 2, 3, 13] }).error).toMatch(/1 to 12/);
  s = ok(s, { type: 'roll', values: [5, 6, 7, 8] }); expect(status(s).phase).toBe('arrange'); expect(status(s).dice).toEqual([5, 6, 7, 8]); expect(rollSpec(s).slots).toEqual([]);
  expect(act(s, { type: 'roll', values: [1, 1, 1, 1] }).error).toMatch(/Already/);
  s = ok(s, { type: 'arrange', order: [2, null, 0, null] }); expect(status(s).phase).toBe('arrange');
  expect(act(s, { type: 'arrange', order: [2, 2, 0, null] }).error).toMatch(/Bad order/); expect(act(s, { type: 'arrange', order: [2, 9, 0, null] }).error).toMatch(/Bad order/);
  s = ok(s, { type: 'arrange', order: [2, 1, 0, 3] }); expect(status(s).phase).toBe('rate'); expect(status(s).canRate).toBe(true);
  s = ok(s, { type: 'arrange', order: [2, 1, 0, null] }); expect(status(s).phase).toBe('arrange');   // took one back out
  s = ok(s, { type: 'arrange', order: [3, 1, 0, 2] }); expect(act(s, { type: 'rate', rating: 'meh' }).error).toMatch(/bad, weak, fair, good or great/);
  s = ok(s, { type: 'rate', rating: 'good' }); expect(status(s).scores).toEqual([7, 0]); expect(status(s).player).toBe(1); expect(status(s).phase).toBe('roll');
  s = ok(s, { type: 'roll', values: [1, 1, 1, 1] }); s = ok(s, { type: 'arrange', order: [0, 1, 2, 3] }); s = ok(s, { type: 'rate', rating: 'fair' });
  expect(status(s).scores).toEqual([7, 5]); expect(status(s).round).toBe(2); expect(status(s).player).toBe(0);
});

test('story: game ends after the set number of stories each; ranking; scorecard; solo @quick', () => {
  let s = mk({ rounds: 1 });
  for (const r of ['bad', 'good']) { s = ok(s, { type: 'roll', values: [1, 2, 3, 4] }); s = ok(s, { type: 'arrange', order: [0, 1, 2, 3] }); s = ok(s, { type: 'rate', rating: r }); }
  expect(status(s).phase).toBe('over'); expect(result(s).winners).toEqual([1]); expect(act(s, { type: 'roll', values: [1, 2, 3, 4] }).error).toMatch(/over/);
  expect(scorecard(s, 1)).toMatchObject({ total: 7, sections: [{ rows: [{ points: 7, rating: 'good' }] }] });
  let solo = newGame('story', { players: ['Me'], options: { dice: 3, rounds: 2 } });
  for (let i = 0; i < 2; i++) { solo = ok(solo, { type: 'roll', values: [1, 2, 3] }); solo = ok(solo, { type: 'arrange', order: [2, 1, 0] }); solo = ok(solo, { type: 'rate', rating: 'fair' }); }
  expect(status(solo).phase).toBe('over'); expect(result(solo).ranking[0].total).toBe(10);
});

test('story bot: rolls, fills the rings one die per step, humans rate; an all-bot table waits for a human grade (PD-173) @quick', () => {
  let s = newGame('story', { players: ['H', 'Bot 2'], bots: [1], options: { dice: 4, rounds: 1 } });
  expect(botMove(s, { seed: 1 })).toBeNull();                                   // the human's turn
  s = ok(s, { type: 'roll', values: [1, 2, 3, 4] }); s = ok(s, { type: 'arrange', order: [0, 1, 2, 3] }); s = ok(s, { type: 'rate', rating: 'fair' });
  expect(status(s).botTurn).toBe(true); expect(botMove(s, { seed: 1 })).toEqual({ type: 'roll' });
  s = ok(s, { type: 'roll', values: [5, 6, 7, 8] });
  const seen = [];
  for (let i = 0; i < 4; i++) { const a = botMove(s, { seed: i }); expect(a.type).toBe('arrange'); s = ok(s, a); seen.push(s.turn.order.slice()); }
  expect(seen.map(o => o.filter(x => x !== null).length)).toEqual([1, 2, 3, 4]);      // one more die each step
  expect(new Set(s.turn.order).size).toBe(4); expect(status(s).phase).toBe('rate');
  expect(botMove(s, { seed: 9 })).toBeNull();                                          // a human is at the table: they rate
  const again = newGame('story', { players: ['H', 'Bot 2'], bots: [1], options: { dice: 4, rounds: 1 } });   // same faces, same round and seat: same order
  let t = ok(ok(ok(ok(again, { type: 'roll', values: [1, 2, 3, 4] }), { type: 'arrange', order: [0, 1, 2, 3] }), { type: 'rate', rating: 'good' }), { type: 'roll', values: [5, 6, 7, 8] });
  for (let i = 0; i < 4; i++) t = ok(t, botMove(t, { seed: 100 + i }));
  expect(t.turn.order).toEqual(s.turn.order);
  s = ok(s, { type: 'rate', rating: 'good' }); expect(status(s).phase).toBe('over');
  let b = newGame('story', { players: ['Bot 1', 'Bot 2'], bots: [0, 1], options: { dice: 3, rounds: 1 } });
  for (let i = 0; i < 12 && status(b).phase !== 'rate'; i++) { const a = botMove(b, { seed: i }); expect(a).not.toBeNull(); b = a.type === 'roll' ? ok(b, { type: 'roll', values: [1, 2, 3] }) : ok(b, a); }
  expect(status(b).phase).toBe('rate'); expect(botMove(b, { seed: 3 })).toBeNull();   // an all-bot table stops and waits for the human judge
  expect(status(ok(b, { type: 'rate', rating: 'good' })).round).toBe(1);   // the human's grade moves it on
  const auto = botMove(b, { seed: 3, autoRate: true }); expect(auto.type).toBe('rate');   // explicit test hook for automated play
  b = ok(b, auto);
  for (let i = 0; i < 12 && status(b).phase !== 'over'; i++) { const a = botMove(b, { seed: i, autoRate: true }); expect(a).not.toBeNull(); b = a.type === 'roll' ? ok(b, { type: 'roll', values: [1, 2, 3] }) : ok(b, a); }
  expect(status(b).phase).toBe('over');
});

test('story: five ratings are worth 0/3/5/7/10 and add up; a game saved with the old 0/1/2 points keeps its totals (PD-192) @quick', () => {
  const pts = { bad: 0, weak: 3, fair: 5, good: 7, great: 10 };
  const info = listGames().find(x => x.id === 'story');
  expect(Object.fromEntries(info.ratings.map(r => [r.id, r.points]))).toEqual(pts); expect(info.ratings.map(r => r.label)).toEqual(['Bad', 'Weak', 'Fair', 'Good', 'Great']);
  let s = newGame('story', { players: ['Me'], options: { dice: 3, rounds: 5 } }), tot = 0;
  for (const r of ['bad', 'weak', 'fair', 'good', 'great']) { s = ok(s, { type: 'roll', values: [1, 2, 3] }); s = ok(s, { type: 'arrange', order: [0, 1, 2] }); s = ok(s, { type: 'rate', rating: r }); tot += pts[r]; expect(status(s).scores).toEqual([tot]); expect(s.tellings[0].at(-1)).toMatchObject({ rating: r, points: pts[r] }); }
  expect(tot).toBe(25); expect(status(s).phase).toBe('over');
  // an old save: two stories rated with the old scale (fair 1, good 2); loading never recomputes, new ratings use the new scale
  let o = newGame('story', { players: ['Me'], options: { dice: 3, rounds: 3 } });
  o = JSON.parse(JSON.stringify(o)); o.scores = [3]; o.tellings = [[{ rating: 'fair', points: 1, faces: [1, 2, 3], order: [0, 1, 2] }, { rating: 'good', points: 2, faces: [1, 2, 3], order: [0, 1, 2] }]]; o.turn = { player: 0, round: 3, faces: null, order: null };
  expect(status(o).scores).toEqual([3]); expect(scorecard(o, 0).total).toBe(3); expect(scorecard(o, 0).sections[0].rows.map(r => r.points)).toEqual([1, 2, null]);
  o = ok(o, { type: 'roll', values: [1, 2, 3] }); o = ok(o, { type: 'arrange', order: [0, 1, 2] }); o = ok(o, { type: 'rate', rating: 'fair' });
  expect(status(o).scores).toEqual([8]); expect(status(o).phase).toBe('over');
});
