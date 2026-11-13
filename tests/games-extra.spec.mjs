// Extra games: Shut the Box, Ship Captain and Crew, Bunco (pure node, fixed dice).
import { test, expect } from '@playwright/test';
import { newGame, status, rollSpec, act, suggest, result, scorecard, listGames } from '../games/index.js';
import { scoreRoll } from '../games/bunco.js';

const ok = (s, a) => { const r = act(s, a); expect(r.error, JSON.stringify(a)).toBeUndefined(); return r; };
const roll = (s, v) => ok(s, { type: 'roll', values: v }).state;
const close = (s, tiles) => ok(s, { type: 'score', tiles }).state;

test('listGames includes the extra games @quick', () => {
  expect(listGames().map(g => g.id)).toEqual(expect.arrayContaining(['shutbox', 'shipcaptain', 'bunco']));
});

test('Shut the Box: close tiles that add up to the roll @quick', () => {
  let s = newGame('shutbox', { players: ['A'] });
  expect(rollSpec(s).slots).toEqual([0, 1]);
  s = roll(s, [3, 4]);
  expect(status(s)).toMatchObject({ phase: 'score', openSum: 45 });
  expect(suggest(s).map(r => r.label)).toEqual(['1 + 2 + 4', '3 + 4', '2 + 5', '1 + 6', '7']);
  expect(suggest(s)[0].best).toBe(true);
  expect(act(s, { type: 'score', tiles: [3, 5] }).error).toMatch(/add up to 7/);
  expect(act(s, { type: 'score', tiles: [7, 7] }).ok).toBe(false);
  expect(act(s, { type: 'roll', values: [1, 1] }).error).toMatch(/Close tiles first/);
  s = close(s, [3, 4]);
  expect(status(s)).toMatchObject({ phase: 'roll', openSum: 38, openTiles: [1, 2, 5, 6, 7, 8, 9] });
  expect(act(s, { type: 'score', tiles: [1] }).ok).toBe(false);   // not rolled yet
  s = close(roll(s, [6, 6]), [5, 7]);
  s = close(roll(s, [1, 1]), [2]);
  expect(status(s).openTiles).toEqual([1, 6, 8, 9]);
});

test('Shut the Box: a dead roll scores the open tiles; shutting the box scores 0; low wins @quick', () => {
  const bust = (s) => { s = close(roll(s, [1, 1]), [2]); return ok(s, { type: 'roll', values: [1, 1] }); };   // second 2 has no tile
  const b = bust(newGame('shutbox', { players: ['A'] }));
  expect(b.events.map(e => e.type)).toEqual(['rolled', 'turnScore', 'gameOver']);
  expect(result(b.state).ranking[0]).toMatchObject({ total: 43 });

  let s = newGame('shutbox', { players: ['A', 'B'] });
  for (const [vals, tiles] of [[[4, 5], [9]], [[2, 6], [8]], [[3, 4], [7]]]) s = close(roll(s, vals), tiles);
  expect(rollSpec(s)).toEqual({ slots: [0], sides: [6] });   // 7, 8 and 9 are shut: one die
  for (const n of [6, 5, 4, 3, 2]) s = close(roll(s, [n]), [n]);
  const last = ok(roll(s, [1]), { type: 'score', tiles: [1] });
  expect(last.events.map(e => e.type)).toEqual(['closed', 'shutTheBox', 'turnScore', 'turn']);
  expect(status(last.state)).toMatchObject({ player: 1, scores: [0, 0] });
  const end = bust(last.state);
  expect(result(end.state)).toEqual({ ranking: [{ player: 0, name: 'A', total: 0, rank: 1 }, { player: 1, name: 'B', total: 43, rank: 2 }], winners: [0] });
  expect(rollSpec(newGame('shutbox', { players: ['A'], options: { oneDie: false } })).slots).toHaveLength(2);
});

test('Ship, Captain and Crew: locks 6, 5, 4 in order, cargo is the other two dice @quick', () => {
  let s = newGame('shipcaptain', { players: ['A', 'B'], options: { rounds: 1 } });
  s = roll(s, [4, 5, 2, 2, 2]);   // needs the 6 first: nothing locks
  expect(status(s)).toMatchObject({ held: Array(5).fill(false), cargo: 0, canBank: false, rollsLeft: 2 });
  expect(act(s, { type: 'bank' }).ok).toBe(false);
  const r2 = ok(s, { type: 'roll', values: [1, 6, 2, 2, 3] });
  expect(r2.events.map(e => e.type)).toEqual(['rolled', 'ship']);
  s = r2.state;
  expect(rollSpec(s).slots).toEqual([0, 2, 3, 4]);
  const r3 = ok(s, { type: 'roll', values: [5, 3, 4, 6] });   // slots 0,2,3,4: captain (slot 0), crew (slot 3); cargo 3 + 6
  expect(r3.events.map(e => e.type)).toEqual(['rolled', 'captain', 'crew', 'turnScore', 'turn']);   // third roll ends the turn
  expect(r3.events.find(e => e.type === 'turnScore')).toMatchObject({ points: 9, crewed: true });
  expect(status(r3.state)).toMatchObject({ player: 1, scores: [9, 0], rollsUsed: 0 });
});

test('Ship, Captain and Crew: one roll can lock all three, bank keeps the cargo, missing crew scores 0 @quick', () => {
  let s = newGame('shipcaptain', { players: ['A', 'B'], options: { rounds: 1 } });
  s = roll(s, [4, 6, 5, 2, 3]);
  expect(status(s)).toMatchObject({ lock: { ship: 1, captain: 2, crew: 0 }, cargo: 5, canBank: true, canRoll: true, held: [true, true, true, false, false] });
  expect(rollSpec(s).slots).toEqual([3, 4]);
  const end = ok(s, { type: 'bank' });
  expect(end.events.at(-1)).toEqual({ type: 'turn', player: 1 });
  s = end.state;
  s = roll(roll(roll(s, [1, 1, 1, 1, 1]), [2, 2, 2, 2, 2]), [3, 3, 3, 3, 3]);   // B never gets a ship
  expect(status(s).phase).toBe('over');
  expect(result(s)).toEqual({ ranking: [{ player: 0, name: 'A', total: 5, rank: 1 }, { player: 1, name: 'B', total: 0, rank: 2 }], winners: [0] });
});

test('Bunco: scoring rolls, a miss ends the turn, six rounds with a rising target @quick', () => {
  expect(scoreRoll([1, 1, 1], 1)).toEqual({ points: 21, kind: 'bunco' });
  expect(scoreRoll([2, 2, 2], 1)).toEqual({ points: 5, kind: 'miniBunco' });
  expect(scoreRoll([1, 3, 1], 1)).toEqual({ points: 2, kind: 'target' });
  expect(scoreRoll([2, 3, 4], 1)).toEqual({ points: 0, kind: 'none' });
  let s = newGame('bunco', { players: ['A', 'B'] });
  s = roll(s, [1, 1, 4]);
  expect(status(s)).toMatchObject({ player: 0, targetNumber: 1, turnTotal: 2, scores: [2, 0] });
  s = roll(s, [1, 5, 6]);
  const miss = ok(s, { type: 'roll', values: [2, 3, 4] });
  expect(miss.events.map(e => e.type)).toEqual(['rolled', 'turnEnd', 'turn']);
  expect(status(miss.state)).toMatchObject({ player: 1, round: 1, scores: [3, 0], turnTotal: 0 });
  // full game: A rolls a Bunco then misses each round, B always misses
  s = newGame('bunco', { players: ['A', 'B'] });
  for (let r = 1; r <= 6; r++) {
    expect(status(s).targetNumber).toBe(r);
    const a = r % 6 + 1, b = (r + 1) % 6 + 1, dud = [a, a, b];
    s = roll(roll(s, [r, r, r]), dud); s = roll(s, dud);
  }
  expect(status(s).phase).toBe('over');
  expect(result(s)).toEqual({ ranking: [{ player: 0, name: 'A', total: 126, rank: 1 }, { player: 1, name: 'B', total: 0, rank: 2 }], winners: [0] });
});
