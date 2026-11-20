// Custom-set grammar slice 1 (PD-167): a Story Dice set in normal roll mode, through the real parser, mat, roll readout, log and bag.
import { test, expect } from './helpers/app.mjs';

test('parseNotation reads, prints and rejects face blocks; ordinary strings are unchanged @quick', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const f = s => { const p = pd.parseNotation(s, true); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod, p.group); };
    return { story: f('5d12{noto#1}'), spaced: f('5D12 { NOTO # 1 } + 2'), two: f('3d6{noto&memes#2}+2d8'), same: f('4d6{noto#1!same}'), ord: f('3d8{noto!ordered}'), kh: f('4d12kh2{noto#1}'),
      group: f('2x 2d6{noto#1}'), plain: ['4d6+2d10+3', 'd20adv+5', '2d20kl', '3d6kh2+1'].map(f),
      d4: f('d4{noto#1}'), d10: f('d10{noto#1}'), pct: f('d%{noto#1}'), nopack: f('d6{zzz#1}'), seed: f('d6{noto#2!ordered}'), big: f('9d20{symbols#1}'), junk: f('d6{noto#1'), cap: f('25d12{noto#1}') };
  });
  expect(r.story).toBe('5d12{noto#1}'); expect(r.spaced).toBe('5d12{noto#1}+2'); expect(r.two).toBe('3d6{memes&noto#2}+2d8');
  expect(r.same).toBe('4d6{noto#1!same}'); expect(r.ord).toBe('3d8{noto!ordered}'); expect(r.kh).toBe('4d12kh2{noto#1}'); expect(r.group).toBe('2x 2d6{noto#1}');
  expect(r.plain).toEqual(['4d6+2d10+3', '2d20kh1+5', '2d20kl1', '3d6kh2+1']);
  expect(r.d4).toMatch(/^ERR.*d4/); expect(r.d10).toMatch(/^ERR.*d10/); expect(r.pct).toMatch(/^ERR.*d%/); expect(r.nopack).toBe('ERR No glyph pack "zzz"');
  expect(r.seed).toMatch(/^ERR.*no seed/); expect(r.big).toMatch(/^ERR Set needs 180 faces; symbols holds 13/); expect(r.junk).toMatch(/^ERR/); expect(r.cap).toMatch(/^ERR Too many dice/);
});

test('rolling 5d12{noto#1} in normal mode paints glyphs, totals by index, and reads as a sentence', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    pd.state.notation = '5d12{noto#1}'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.simRoll();
    const e = pd.bag.log.at(-1), txt = document.querySelector('#result .brk') ? document.querySelector('#result').textContent : '';
    return { notation: e.notation, total: e.total, detail: e.detail, story: e.story, n: pd.state.notation, glyphed: [...Array(5).keys()].length, result: txt };
  });
  expect(r.notation).toBe('5d12{noto#1}');
  const m = r.detail.match(/^5d12: (.+)$/); expect(m).toBeTruthy();   // PD-192 D: glyph names beside the index, no meaningless sum
  const parts = m[1].split(' + '); expect(parts.length).toBe(5);
  for (const p of parts) expect(p, p).toMatch(/^[a-z0-9 ]+=\d+$/i);
  expect(r.detail).not.toMatch(/ = \d+$/); expect(r.total).toBe('');
  expect(r.story.length).toBeGreaterThan(10); expect(r.result).toContain(r.story);
});

test('the same text deals the same glyphs in a fresh page; the dice carry them', async ({ shared: app }) => {
  await app.reset(1);
  const a = await app.run(pd => { pd.state.notation = '3d6{noto#7}+2'; pd.state.shape = 'custom'; pd.buildDice(); return { glyphs: pd.dice.map(d => d.glyphs && d.glyphs.map(g => g.id)) }; });
  await app.reset(2);
  const b = await app.run(pd => { pd.state.notation = '3d6{noto#7}+2'; pd.state.shape = 'custom'; pd.buildDice(); return { glyphs: pd.dice.map(d => d.glyphs && d.glyphs.map(g => g.id)) }; });
  expect(b).toEqual(a); expect(a.glyphs.length).toBe(3); expect(a.glyphs.every(g => g && g.length === 6)).toBe(true);
  const c = await app.run(pd => { pd.state.notation = '4d6{noto#7}+2'; pd.buildDice(); return pd.dice.map(d => d.glyphs.map(g => g.id)); });
  expect(c.slice(0, 3)).toEqual(a.glyphs);   // adding a die keeps the first three
});

test('an ordinary set has no glyphs and a Story set in the bag saves, reloads and quick-rolls; the bag stays v1', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(async pd => {
    pd.state.notation = '3d6'; pd.state.shape = 'custom'; pd.buildDice();
    const plain = pd.dice.every(d => !d.glyphs);
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'st', name: 'Story', terms: [{ count: 4, sides: 8, faces: { kind: 'deal', packs: ['noto'], seed: 3, dice: 'different', order: 'shuffled' } }], mod: 1 }], active: { design: 'a' } }, { replace: true });
    const tot = pd.setOps.quick('st'), e = pd.bag.log.at(-1), json = pd.bagToJSON();
    const back = pd.parseBag(JSON.parse(JSON.stringify(pd.bag)));
    return { plain, tot, notation: e.notation, detail: e.detail, version: json.version, faces: back.bag.sets[0].terms[0].faces };
  });
  expect(r.plain).toBe(true);
  expect(r.notation).toBe('4d8{noto#3}+1');
  expect(r.detail).toMatch(/^4d8: [a-z0-9 ]+=\d+ \+ [a-z0-9 ]+=\d+ \+ [a-z0-9 ]+=\d+ \+ [a-z0-9 ]+=\d+ = \d+  ·  \+1$/i);   // a modifier keeps its total
  expect(r.version).toBe(1); expect(r.faces).toEqual({ kind: 'deal', packs: ['noto'], seed: 3, dice: 'different', order: 'shuffled' });
});

test('a glyph-only quick roll logs names and no total; the text export has no "= N" for it (PD-192 D)', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(async pd => {
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'g', name: 'Glyphs', terms: [{ count: 3, sides: 6, faces: { kind: 'deal', packs: ['noto'], seed: 3, dice: 'different', order: 'shuffled' } }], mod: 0 }], active: { design: 'a' } }, { replace: true });
    pd.setOps.quick('g'); const e = pd.bag.log.at(-1); return { total: e.total, detail: e.detail, txt: pd.logText ? pd.logText() : null };
  });
  expect(r.total).toBe(''); expect(r.detail).toMatch(/^3d6: [a-z0-9 ]+=\d+ \+ [a-z0-9 ]+=\d+ \+ [a-z0-9 ]+=\d+$/i);
  if (r.txt !== null) expect(r.txt).not.toMatch(/= \d+/);
});
