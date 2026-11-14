// Group roll: "4x d20+2" rolls the dice four separate times, modifier added to each (PD-142.14.1.2).
import { test, expect } from './helpers/app.mjs';

test('parses Nx groups, round-trips them and enforces the dice cap', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const f = s => { const p = pd.parseNotation(s); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod, p.group); };
    return { a: f('4x d20+2'), b: f('3X2d6kh1-1'), one: f('1x d20'), big: f('13x 2d6'), ok: f('12x 2d6'), plain: f('4d6') };
  });
  expect(r.a).toBe('4x 1d20+2'); expect(r.b).toBe('3x 2d6kh1-1'); expect(r.one).toMatch(/^ERR/);
  expect(r.big).toMatch(/Too many dice/); expect(r.ok).toBe('12x 2d6'); expect(r.plain).toBe('4d6');
});

test('a physical 4x d20+2 roll shows four separate totals, each with the modifier, and logs them', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    pd.state.notation = '4x d20+2'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false);
    pd.simRoll(); const e = pd.bag.log.at(-1);
    return { total: e.total, notation: e.notation, texts: e.items ? e.items.map(i => i.text) : [], shown: document.querySelector('#result .tot').textContent };
  });
  const totals = r.total.split(' · ').map(Number); expect(totals).toHaveLength(4);
  r.texts.forEach((t, i) => { const m = t.match(/^#(\d+): (\d+) \+ 2 = (\d+)$/); expect(m).toBeTruthy(); expect(+m[1]).toBe(i + 1); expect(+m[3]).toBe(+m[2] + 2); expect(+m[3]).toBe(totals[i]); });
  expect(r.shown).toBe(r.total); expect(r.notation).toBe('4x d20+2');
});

test('a saved group set quick-rolls separately and the quick roll bar takes the formula', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(async pd => {
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'gob', name: 'Goblins', terms: [{ count: 1, sides: 20 }], mod: 4, group: 3 }], active: { design: 'a' } }, { replace: true });
    const tot = pd.setOps.quick('gob'); const e = pd.bag.log.at(-1);
    pd.setOps.saveCurrent; pd.state.notation = '2x d8+1'; pd.state.shape = 'custom';
    return { tot, notation: e.notation, texts: e.items.map(i => i.text), saved: (pd.setOps.saveCurrent('Two'), pd.bag.sets.find(s => s.name === 'Two')) };
  });
  expect(r.notation).toBe('3x 1d20+4'); expect(String(r.tot).split(' · ')).toHaveLength(3); expect(r.texts).toHaveLength(3);
  r.texts.forEach(t => { const m = t.match(/^#\d+: (\d+) \+ 4 = (\d+)$/); expect(m).toBeTruthy(); expect(+m[2]).toBe(+m[1] + 4); });
  expect(r.saved.group).toBe(2); expect(r.saved.mod).toBe(1);
});
