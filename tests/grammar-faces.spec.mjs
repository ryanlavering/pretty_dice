// Custom-set grammar slice 1 (PD-167): the face block {pack#n!flags} and the seeded deal. Pure node tests, no page.
import { test, expect } from '@playwright/test';
import { dealError, dealTerms, fmtFaces, parseFaceBlock } from '../src/faces.js';

const faces = body => { const r = parseFaceBlock(body); if (r.error) throw new Error(r.error); return r.faces; };
const ids = (dealt, ti = 0) => dealt[ti].map(die => die.map(g => g.id));

test('face blocks parse to the model and print the normal form @quick', () => {
  expect(faces('noto#1')).toEqual({ kind: 'deal', packs: ['noto'], seed: 1, dice: 'different', order: 'shuffled' });
  expect(fmtFaces(faces('noto'))).toBe('{noto#1}');                       // seed defaults to 1 and is always printed
  expect(fmtFaces(faces('noto&memes#2'))).toBe('{memes&noto#2}');         // shuffled: pack ids sorted
  expect(fmtFaces(faces('noto#1!same'))).toBe('{noto#1!same}');
  expect(fmtFaces(faces('noto!ordered'))).toBe('{noto!ordered}');         // ordered: no seed
  expect(fmtFaces(faces('noto!ordered!same'))).toBe('{noto!same!ordered}');
});

test('face block errors are plain @quick', () => {
  expect(parseFaceBlock('xyz#1').error).toBe('No glyph pack "xyz"');
  expect(parseFaceBlock('noto#2!ordered').error).toMatch(/no seed/);
  expect(parseFaceBlock('noto!wild').error).toMatch(/Unknown face flag/);
  expect(parseFaceBlock('').error).toMatch(/Can't read/);
  expect(parseFaceBlock('noto#9999999').error).toMatch(/too large/);
});

test('same face block gives the same faces, a different seed gives different faces @quick', () => {
  const t = [{ count: 5, sides: 12, faces: faces('noto#1') }];
  expect(ids(dealTerms(t))).toEqual(ids(dealTerms(t)));
  expect(ids(dealTerms([{ count: 5, sides: 12, faces: faces('noto#2') }]))).not.toEqual(ids(dealTerms(t)));
  const flat = ids(dealTerms(t)).flat(); expect(flat.length).toBe(60); expect(new Set(flat).size).toBe(60);   // different dice: unique across the set
});

test('adding a die keeps the faces of the earlier dice (owner decision 3) @quick', () => {
  const five = ids(dealTerms([{ count: 5, sides: 12, faces: faces('noto#1') }])), six = ids(dealTerms([{ count: 6, sides: 12, faces: faces('noto#1') }]));
  expect(six.slice(0, 5)).toEqual(five); expect(six.length).toBe(6);
  // a die of another size added later in term order also leaves the earlier dice alone
  const dm = dealTerms([{ count: 5, sides: 12, faces: faces('noto#1') }, { count: 1, sides: 6, faces: faces('noto#1') }]), mixed = [...ids(dm, 0), ...ids(dm, 1)];
  expect(mixed.slice(0, 5)).toEqual(five); expect(new Set(mixed.flat()).size).toBe(66);   // one deal across both terms
});

test('!same gives every die the same face list; !ordered takes the pack in its original order @quick', () => {
  const same = ids(dealTerms([{ count: 4, sides: 8, faces: faces('noto#1!same') }]));
  for (const d of same) expect(d).toEqual(same[0]);
  const ord = ids(dealTerms([{ count: 2, sides: 6, faces: faces('noto!ordered') }])), first = ord.flat();
  const diff = ids(dealTerms([{ count: 2, sides: 6, faces: faces('noto#1') }])).flat();
  expect(first).not.toEqual(diff);   // shuffled differs from the pack order
  expect(ord[1][0]).toBe(first[6]);
  expect(ids(dealTerms([{ count: 2, sides: 6, faces: faces('noto!ordered') }]))).toEqual(ord);   // no seed involved, always the same
  const sameOrd = ids(dealTerms([{ count: 3, sides: 6, faces: faces('noto!same!ordered') }])); expect(sameOrd[2]).toEqual(ord[0]);
});

test('terms with different deals do not share a pool; no-face terms are skipped @quick', () => {
  const r = dealTerms([{ count: 1, sides: 6 }, { count: 2, sides: 6, faces: faces('noto#4') }, { count: 2, sides: 6, faces: faces('memes#4') }]);
  expect(r[0]).toBeNull(); expect(r[1].length).toBe(2); expect(r[2].flat().every(g => g.pack === 'memes')).toBe(true);
});

test('pool too small is reported with the need and the pool size @quick', () => {
  expect(dealError([{ count: 9, sides: 20, faces: faces('symbols#1') }])).toMatch(/^Set needs 180 faces; symbols holds 13/);
  expect(dealError([{ count: 9, sides: 12, faces: faces('symbols#1!same') }])).toBeNull();
  expect(dealError([{ count: 2, sides: 20, faces: faces('symbols#1!same') }])).toMatch(/needs 20 faces; symbols holds 13/);
  expect(dealError([{ count: 5, sides: 12, faces: faces('noto#1') }])).toBeNull();
});
