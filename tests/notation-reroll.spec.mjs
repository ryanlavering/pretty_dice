// Roll notation: per-die reroll r (PD-142.42.1): r1, r<N, r<=N, r>N, r>=N. Re-evaluated once per die from the same RNG stream, before keep/drop.
import { test, expect } from './helpers/app.mjs';

// runs inside the page: one set from a notation (page functions cannot close over test-file helpers)
const BAG = `(async (pd, name, notation) => { const p = pd.parseNotation(notation); await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }], sets: [{ id: name, name, terms: p.terms, mod: p.mod, ...(p.group ? { group: p.group } : {}) }], active: { design: 'a' } }, { replace: true }); })`;

test('@quick parser: accepts r1 r<N r<=N r>N r>=N, normalises r before keep, either order', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => { const f = s => { const p = pd.parseNotation(s); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod, p.group); };
    return Object.fromEntries(['d20r1+5', '4d6r<=2', '2d6r<3', 'd20r>18', 'd20r>=19', '2d20kh1r1', '2d20r1kh1', 'd20advr1+5', 'd20r1adv', '4D6 R1 KH3', '4d6kh3r<=2+2', '4x d20r1+2', 'd20r1+d6r<3', '3d6r1@x', '4d6r', '4d6r<', 'd6r<7', 'd6r<=6', 'd6r>0', 'd6r7', 'd%r1', 'd6r1{abc}', '24d6r1', '25d6r1', '5x 5d6r1'].map(s => [s, f(s)])); });
  expect(r['d20r1+5']).toBe('1d20r1+5'); expect(r['4d6r<=2']).toBe('4d6r<=2'); expect(r['2d6r<3']).toBe('2d6r<3');
  expect(r['d20r>18']).toBe('1d20r>18'); expect(r['d20r>=19']).toBe('1d20r>=19');
  expect(r['2d20kh1r1']).toBe('2d20r1kh1'); expect(r['2d20r1kh1']).toBe('2d20r1kh1');
  expect(r['d20advr1+5']).toBe('2d20r1kh1+5'); expect(r['d20r1adv']).toBe('2d20r1kh1');
  expect(r['4D6 R1 KH3']).toBe('4d6r1kh3'); expect(r['4d6kh3r<=2+2']).toBe('4d6r<=2kh3+2');
  expect(r['4x d20r1+2']).toBe('4x 1d20r1+2'); expect(r['d20r1+d6r<3']).toBe('1d20r1+1d6r<3');
  for (const bad of ['4d6r', '4d6r<', 'd6r<7', 'd6r<=6', 'd6r>0', 'd6r7', 'd%r1', 'd6r1{abc}', '25d6r1', '5x 5d6r1']) expect(r[bad], bad).toMatch(/^ERR/);
  expect(r['d6r<7']).toMatch(/would reroll every face/); expect(r['d6r<=6']).toMatch(/every face/);
  expect(r['24d6r1']).toBe('24d6r1');   // rerolled dice are re-evaluated, never added: only the thrown dice count toward the cap
  expect(r['25d6r1']).toMatch(/Too many dice/);
});

test('@quick evaluation order: reroll first, then keep; each die once; the new value stands', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const t = { count: 2, sides: 20, reroll: { op: '=', v: 1 }, keep: { mode: 'h', n: 1 } }; let calls = 0;
    const a = pd.applyReroll([1, 7], t, () => { calls++; return 14; }), ks = pd.keepSum(a.vals, t.keep);   // 2d20r1kh1 with 1,7: the 1 becomes 14, then 14 beats 7
    const b = pd.applyReroll([1, 7], t, () => { calls++; return 1; });                                       // rerolled to 1 again: it stays 1 (once only)
    const c = pd.applyReroll([5, 9], { ...t, reroll: { op: '<=', v: 2 } }, () => { calls++; return 3; });
    return { a, sum: ks.sum, kept: [...ks.kept], b, c, calls };
  });
  expect(r.a.vals).toEqual([14, 7]); expect(r.a.orig[0]).toBe(1); expect(r.a.orig[1]).toBeUndefined(); expect(r.sum).toBe(14); expect(r.kept).toEqual([0]);
  expect(r.b.vals).toEqual([1, 7]); expect(r.c.vals).toEqual([5, 9]); expect(r.calls).toBe(2);
});

test('quick roll: breakdown shows 1→14 style, total uses final values, ?seed=N reproduces it', async ({ shared: app }) => {
  const once = async () => { await app.reset(7); return app.run(async (pd, BAG) => { await eval(BAG)(pd, 'rr', '4d20r<=19kh3+2'); const tot = pd.setOps.quick('rr'); const e = pd.bag.log.at(-1); return { tot, detail: e.detail, notation: e.notation, copy: pd.logText() }; }, BAG); };
  const a = await once(), b = await once();
  expect(a.notation).toBe('4d20r<=19kh3+2');
  expect(a.detail).toBe(b.detail); expect(a.tot).toBe(b.tot);
  const m = a.detail.match(/^4d20r<=19kh3: (.+) = (\d+)/); expect(m).toBeTruthy();
  const dice = m[1].split('+').map(x => { const s = x.replace(/[()]/g, ''), p = s.split('→'); return { dropped: x.startsWith('('), orig: p.length > 1 ? +p[0] : null, val: +p.at(-1) }; });
  expect(dice.length).toBe(4); expect(dice.filter(d => d.orig !== null).length).toBeGreaterThan(0);
  for (const d of dice) if (d.orig !== null) expect(d.orig).toBeLessThanOrEqual(19);
  expect(dice.filter(d => d.dropped).length).toBe(1);
  const kept = dice.filter(d => !d.dropped).reduce((s, d) => s + d.val, 0); expect(+m[2]).toBe(kept); expect(a.tot).toBe(kept + 2);
  expect(a.copy).toMatch(/\d+→\d+/);   // Copy keeps the original value
});

test('group roll: 4x d20r<=19+2 rerolls each die in each roll', async ({ shared: app }) => {
  await app.reset(3);
  const r = await app.run(async (pd, BAG) => { await eval(BAG)(pd, 'g', '4x d20r<=19+2'); pd.setOps.quick('g'); return pd.bag.log.at(-1); }, BAG);
  const lines = r.items.map(i => i.text); expect(lines.length).toBe(4);
  for (const l of lines) { const m = l.match(/^#\d: (?:(\d+)→)?(\d+) \+ 2 = (\d+)$/); expect(m, l).toBeTruthy(); expect(+m[3]).toBe(+m[2] + 2); if (m[1]) expect(+m[1]).toBeLessThanOrEqual(19); }
  expect(lines.some(l => l.includes('→'))).toBe(true);
});

test('physical roll: breakdown and log show the original, the FINAL die decides NATURAL labels', async ({ shared: app }) => {
  await app.reset(5);
  for (const seed of [5, 6, 7, 8]) {
    await app.reset(seed);
    const r = await app.run(pd => { pd.state.notation = 'd20r>=2'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.simRoll(); const e = pd.bag.log.at(-1);
      return { total: +e.total, detail: e.detail, notation: e.notation, text: document.querySelector('#result').textContent }; });
    expect(r.notation).toBe('d20r>=2');
    const m = r.detail.match(/^1d20r>=2: (?:(\d+)→)?(\d+)$/); expect(m, r.detail).toBeTruthy();
    expect(r.total).toBe(+m[2]);
    expect(r.text.includes('Natural 20')).toBe(+m[2] === 20); expect(r.text.includes('Natural 1') && !r.text.includes('Natural 20')).toBe(+m[2] === 1);
    expect(r.text).toContain(r.detail.replace(/^[^:]+: /, ''));
  }
});

test('physical group roll: 2x 2d20r<=19kh1 shows the original per die and keeps the final values', async ({ shared: app }) => {
  await app.reset(9);
  const r = await app.run(pd => { pd.state.notation = '2x 2d20r<=19kh1+1'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.simRoll(); const e = pd.bag.log.at(-1); return { total: e.total, detail: e.detail, n: pd.state.notation }; });
  const lines = r.detail.split('  ·  '); expect(lines.length).toBe(2);
  const totals = r.total.split(' · ').map(Number);
  lines.forEach((l, i) => { const m = l.match(/^#\d: (.+) \+ 1 = (\d+)$/); expect(m, l).toBeTruthy(); const vs = m[1].split('+').map(x => ({ d: x.startsWith('('), v: +x.replace(/[()]/g, '').split('→').at(-1) }));
    expect(vs.filter(x => x.d).length).toBe(1); expect(+m[2]).toBe(vs.find(x => !x.d).v + 1); expect(totals[i]).toBe(+m[2]); });
});
