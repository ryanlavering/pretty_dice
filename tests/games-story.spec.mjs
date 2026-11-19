// Story Dice engine (PD-160 spike): pure node tests.
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, scorecard, result, listGames } from '../games/index.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r.state; };
const mk = (opts = {}, players = ['A', 'B']) => newGame('story', { players, options: { dice: 4, rounds: 2, ...opts } });

test('story: listed with options, defaults, solo allowed, no bots @quick', () => {
  const g = listGames().find(x => x.id === 'story'); expect(g.name).toBe('Story Dice'); expect(g.minPlayers).toBe(1); expect(g.noBots).toBe(true);
  expect(g.options.map(o => o.id)).toEqual(['dice', 'sides', 'rounds', 'seed', 'hints', 'packs']);
  const s = newGame('story', { players: ['Me'] }); expect(s.options.dice).toBe(5); expect(s.options.sides).toBe(12); expect(s.options.packs).toEqual(['noto']);
});

test('story: roll -> arrange (partial then full) -> rate -> next player; points 0/1/2 @quick', () => {
  let s = mk(); expect(status(s).phase).toBe('roll'); expect(rollSpec(s)).toEqual({ slots: [0, 1, 2, 3], sides: [12, 12, 12, 12] });
  expect(act(s, { type: 'rate', rating: 'good' }).error).toMatch(/order/); expect(act(s, { type: 'arrange', order: [0, 1, 2, 3] }).error).toMatch(/Roll first/);
  expect(act(s, { type: 'roll', values: [1, 2, 3] }).error).toMatch(/Expected 4/); expect(act(s, { type: 'roll', values: [1, 2, 3, 13] }).error).toMatch(/1 to 12/);
  s = ok(s, { type: 'roll', values: [5, 6, 7, 8] }); expect(status(s).phase).toBe('arrange'); expect(status(s).dice).toEqual([5, 6, 7, 8]); expect(rollSpec(s).slots).toEqual([]);
  expect(act(s, { type: 'roll', values: [1, 1, 1, 1] }).error).toMatch(/Already/);
  s = ok(s, { type: 'arrange', order: [2, null, 0, null] }); expect(status(s).phase).toBe('arrange');
  expect(act(s, { type: 'arrange', order: [2, 2, 0, null] }).error).toMatch(/Bad order/); expect(act(s, { type: 'arrange', order: [2, 9, 0, null] }).error).toMatch(/Bad order/);
  s = ok(s, { type: 'arrange', order: [2, 1, 0, 3] }); expect(status(s).phase).toBe('rate'); expect(status(s).canRate).toBe(true);
  s = ok(s, { type: 'arrange', order: [2, 1, 0, null] }); expect(status(s).phase).toBe('arrange');   // took one back out
  s = ok(s, { type: 'arrange', order: [3, 1, 0, 2] }); expect(act(s, { type: 'rate', rating: 'great' }).error).toMatch(/bad, fair or good/);
  s = ok(s, { type: 'rate', rating: 'good' }); expect(status(s).scores).toEqual([2, 0]); expect(status(s).player).toBe(1); expect(status(s).phase).toBe('roll');
  s = ok(s, { type: 'roll', values: [1, 1, 1, 1] }); s = ok(s, { type: 'arrange', order: [0, 1, 2, 3] }); s = ok(s, { type: 'rate', rating: 'fair' });
  expect(status(s).scores).toEqual([2, 1]); expect(status(s).round).toBe(2); expect(status(s).player).toBe(0);
});

test('story: game ends after the set number of stories each; ranking; scorecard; solo @quick', () => {
  let s = mk({ rounds: 1 });
  for (const r of ['bad', 'good']) { s = ok(s, { type: 'roll', values: [1, 2, 3, 4] }); s = ok(s, { type: 'arrange', order: [0, 1, 2, 3] }); s = ok(s, { type: 'rate', rating: r }); }
  expect(status(s).phase).toBe('over'); expect(result(s).winners).toEqual([1]); expect(act(s, { type: 'roll', values: [1, 2, 3, 4] }).error).toMatch(/over/);
  expect(scorecard(s, 1)).toMatchObject({ total: 2, sections: [{ rows: [{ points: 2, rating: 'good' }] }] });
  let solo = newGame('story', { players: ['Me'], options: { dice: 3, rounds: 2 } });
  for (let i = 0; i < 2; i++) { solo = ok(solo, { type: 'roll', values: [1, 2, 3] }); solo = ok(solo, { type: 'arrange', order: [2, 1, 0] }); solo = ok(solo, { type: 'rate', rating: 'fair' }); }
  expect(status(solo).phase).toBe('over'); expect(result(solo).ranking[0].total).toBe(2);
});
