// Story dice spike (PD-160): seeded glyph deal, sentence generator and ring arrangement model. Pure node tests.
import { test, expect } from '@playwright/test';
import * as S from '../src/story.js';

const d12x5 = Array(5).fill({ faces: 12 });

test('glyph pool: unique ids, a path each, word banks present, all three tiers @quick', () => {
  const ids = new Set(S.GLYPHS.map(g => g.id)); expect(ids.size).toBe(S.GLYPHS.length);
  for (const g of S.GLYPHS) {
    expect(g.path.length, g.id).toBeGreaterThan(20);
    for (const k of ['n', 'a', 'd']) expect(g[k].length, g.id + k).toBeGreaterThanOrEqual(k === 'n' ? 1 : 2);
    expect(g.v.some(v => v.endsWith('!')), g.id + ' needs an intransitive verb').toBe(true);
    expect(g.v.some(v => !v.endsWith('!')), g.id + ' needs a transitive verb').toBe(true);
  }
  expect(new Set(S.GLYPHS.filter(g => g.pack === 'noto').map(g => g.tier))).toEqual(new Set(['c', 'o']));
  expect(S.poolFor(['noto', 'symbols']).length).toBeGreaterThanOrEqual(9 * 12);   // nine d12 fit
  expect(S.PACK_LIST.map(p => p.id)).toEqual(['noto', 'symbols', 'memes', 'gameicons', 'fontawesome', 'hiero']);
});

test('deal is stable for a fingerprint, unique across all faces, different for another set @quick', () => {
  const a = S.dealGlyphs(d12x5), b = S.dealGlyphs(d12x5), flat = a.flat();
  expect(b).toEqual(a); expect(flat.length).toBe(60); expect(new Set(flat).size).toBe(60);
  expect(a.map(r => r.length)).toEqual([12, 12, 12, 12, 12]);
  expect(S.dealGlyphs(d12x5, S.fingerprint(d12x5, 'other'))).not.toEqual(a);
  const mixed = S.dealGlyphs([{ faces: 6 }, { faces: 8 }, { faces: 20 }]); expect(new Set(mixed.flat()).size).toBe(34);
});

test('deal rejects bad set sizes @quick', () => {
  expect(() => S.dealGlyphs([{ faces: 6 }, { faces: 6 }])).toThrow(/3-9/);
  expect(() => S.dealGlyphs(Array(9).fill({ faces: 20 }))).toThrow(/pool/);
});

test('sentences: deterministic, salt re-words, one clause per chunk, every glyph used, ends with a full stop @quick', () => {
  const ids = S.dealGlyphs(d12x5).flat().slice(0, 9);
  for (let n = 1; n <= 9; n++) {
    const s = S.sentenceFor(ids.slice(0, n), 0);
    expect(s).toEqual(S.sentenceFor(ids.slice(0, n), 0));
    expect(s.text).toMatch(/^[A-Z].*\.$/); expect(s.text).not.toMatch(/undefined|\bnull\b|!/);
    expect(s.clauses.flatMap(c => c.glyphs)).toEqual(ids.slice(0, n));
    for (const c of s.clauses) expect(c.glyphs.length).toBeLessThanOrEqual(3);
  }
  const texts = new Set([0, 1, 2, 3, 4].map(k => S.sentenceFor(ids.slice(0, 5), k).text)); expect(texts.size).toBeGreaterThan(1);
  expect(S.sentenceFor([...ids.slice(0, 4)].reverse(), 0).text).not.toBe(S.sentenceFor(ids.slice(0, 4), 0).text);   // order matters
});

test('sentences use words from the glyphs they were built from @quick', () => {
  const g = S.GLYPH_BY_ID.get('noto:cat'), h = S.GLYPH_BY_ID.get('noto:moon'), k = S.GLYPH_BY_ID.get('noto:key');
  for (let salt = 0; salt < 30; salt++) {
    const t = S.sentenceFor(['noto:cat', 'noto:moon', 'noto:key'], salt).text.toLowerCase();
    expect([...g.n, ...h.n, ...k.n].some(w => t.includes(w.toLowerCase())), t).toBe(true);
  }
  expect(S.hintFor('noto:cat').nouns).toContain('cat'); expect(S.hintFor('nope')).toBeNull();
});

test('arrangement: click-fill in order, drag with autoswap, no-swap blocks, completion @quick', () => {
  let a = S.newArrangement(4); expect(S.poolOf(a)).toEqual([0, 1, 2, 3]);
  a = S.fillNext(a, 2); a = S.fillNext(a, 0); expect(a.rings).toEqual([2, 0, null, null]); expect(S.poolOf(a)).toEqual([1, 3]);
  expect(S.fillNext(a, 2)).toBe(a);                                   // already placed
  a = S.dropDie(a, 2, 1); expect(a.rings).toEqual([0, 2, null, null]);   // ring to ring: autoswap
  a = S.dropDie(a, 3, 3); expect(a.rings).toEqual([0, 2, null, 3]);      // pool to an empty ring
  a = S.dropDie(a, 1, 0); expect(a.rings).toEqual([1, 2, null, 3]); expect(S.poolOf(a)).toEqual([0]);   // pool onto occupied ring bumps the occupant back to the pool
  expect(S.dropDie(a, 3, 0, { autoswap: false })).toBe(a);
  a = S.fillNext(a, 0); expect(S.complete(a)).toBe(true); expect(S.fillNext(a, 0)).toBe(a);
  expect(S.removeDie(a, 2).rings).toEqual([1, null, 0, 3].map((x, i) => i === 1 ? null : a.rings[i]));
});

test('packs: each pack has valid glyphs with a path, viewBox and word banks; deal works from any single pack and a mix @quick', () => {
  for (const p of S.PACK_LIST) {
    expect(p.safe, p.id).toBe(true); expect(p.license && p.credit, p.id).toBeTruthy();
    const pool = S.poolFor([p.id]); expect(pool.length, p.id).toBe(p.count); expect(p.count, p.id).toBeGreaterThanOrEqual(13);
    for (const g of pool) { expect(g.path.length, g.id).toBeGreaterThan(10); expect(g.vb, g.id).toMatch(/^[-\d. ]+$/); expect(g.n.length && g.a.length && g.d.length && g.v.length, g.id).toBeTruthy();
      expect(g.v.some(v => v.endsWith('!')) && g.v.some(v => !v.endsWith('!')), g.id + ' verbs').toBe(true); }
    const sets = pool.length >= 36 ? [{ faces: 6 }, { faces: 6 }, { faces: 6 }] : [{ faces: 4 }, { faces: 4 }, { faces: 4 }];
    expect(new Set(S.dealGlyphs(sets, S.fingerprint(sets, '', [p.id]), pool).flat()).size).toBe(sets.length * sets[0].faces);
    const text = S.sentenceFor(pool.slice(0, 5).map(g => g.id), 0).text; expect(text).toMatch(/^[A-Z].*\.$/);
  }
  const all = S.poolFor(S.PACK_LIST.map(p => p.id)); expect(all.length).toBe(S.GLYPHS.length);
  expect(S.fingerprint(d12x5, '', ['noto', 'hiero'])).toBe(S.fingerprint(d12x5, '', ['hiero', 'noto']));   // pack order does not matter
  expect(S.fingerprint(d12x5, '', ['noto'])).not.toBe(S.fingerprint(d12x5, '', ['noto', 'hiero']));
});

test('bot ad-lib: deterministic, re-wordable, wackier than the plain sentence, every time ends with a closing line @quick', () => {
  const ids = S.dealGlyphs(d12x5).flat().slice(0, 7);
  for (let n = 1; n <= 7; n++) {
    const a = S.adLibFor(ids.slice(0, n), 0); expect(S.adLibFor(ids.slice(0, n), 0)).toEqual(a);
    expect(a.text).toMatch(/^[A-Z].*[.]$/); expect(a.text).not.toMatch(/undefined|null|!/); expect(a.clauses.flatMap(c => c.glyphs)).toEqual(ids.slice(0, n));
    expect(a.text).toMatch(/(The end|why we have rules|Nobody was ever|all week|continued|always check|No refunds)/);
  }
  expect(new Set([0, 1, 2, 3, 4, 5].map(k => S.adLibFor(ids.slice(0, 5), k).text)).size).toBeGreaterThan(3);
  expect(S.adLibFor(ids.slice(0, 5), 0).text).not.toBe(S.sentenceFor(ids.slice(0, 5), 0).text);
  expect(S.adLibFor([], 0).text).toBe('');
});
