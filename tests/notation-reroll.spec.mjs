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

// PD-212: the reroll is a real re-throw of just the matching dice (ring first), not a re-evaluation
test('physics reroll: matching dice get the ring, then only they are re-thrown once; reproducible with a seed', async ({ shared: app }) => {
  const once = async seed => { await app.reset(seed); return app.run(pd => {
    pd.state.notation = '6d6r<=3'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false);
    pd.step(1500); const first = pd.faces.slice(), pend = pd.rrPending, rings = pd.rrRingCount, hidden = !document.querySelector('#result').classList.contains('on');
    const posBefore = pd.bodies.map(b => b.position.toArray());
    pd.settleRoll(); const e = pd.bag.log.at(-1); return { first, pend, rings, hidden, orig: pd.rrOrig, final: pd.faces.slice(), detail: e && e.detail, total: e && +e.total, rerolls: pd.rrOrig.length }; }); };
  let seen = 0;
  for (const seed of [11, 12, 13, 14, 15]) {
    const a = await once(seed), b = await once(seed);
    expect(b.detail).toBe(a.detail); expect(b.final).toEqual(a.final);
    expect(a.pend === null ? [] : a.pend).toEqual(a.first.map((v, i) => v <= 3 ? i : -1).filter(i => i >= 0));
    if (!a.pend) { expect(a.detail).not.toContain('→'); continue; }
    seen++; expect(a.rings).toBe(a.pend.length); expect(a.hidden).toBe(true);
    for (const [i, o] of a.orig) { expect(o).toBe(a.first[i]); expect(o).toBeLessThanOrEqual(3); }
    expect(a.rerolls).toBeGreaterThanOrEqual(a.pend.length);   // only matching dice are thrown; a die the thrown ones knock onto a matching face rings and is thrown once too
    const m = a.detail.match(/^6d6r<=3: (.+) = (\d+)$/); expect(m, a.detail).toBeTruthy();
    expect(m[1].split('+').filter(x => x.includes('→')).length).toBe(a.pend.length); expect(a.total).toBe(+m[2]);
    expect(m[1].split('+').map(x => +x.split('→').at(-1))).toEqual(a.final);   // a rerolled die is final even if it matches again
  }
  expect(seen).toBeGreaterThan(0);
});

test('manual rerolls: ring and chip wait, the chip throws; a new roll keeps the first values', async ({ shared: app }) => {
  await app.reset(21);
  const r = await app.run(pd => {
    pd.state.manualReroll = true; pd.state.notation = '6d6r<=3'; pd.state.shape = 'custom'; pd.buildDice(); const n0 = pd.bag.log.length; pd.startRoll(false, false); pd.step(1500);
    const out = { pend: pd.rrPending, manual: pd.rrManual, rings: pd.rrRingCount, chip: document.querySelector('#result .rrchip')?.textContent, logged: pd.bag.log.length - n0, first: pd.faces.slice() };
    pd.rerollNow(); out.afterThrow = { settled: pd.settled, pend: pd.rrPending, chip: !!document.querySelector('#result .rrchip') };
    pd.settleRoll(); out.final = pd.faces.slice(); out.detail = pd.bag.log.at(-1)?.detail; out.logged2 = pd.bag.log.length - n0;
    return out; });
  expect(r.pend, 'seed 21 should have a match').not.toBeNull(); expect(r.manual).toBe(true); expect(r.rings).toBe(r.pend.length); expect(r.chip).toMatch(/Re-roll \d+ di/); expect(r.logged).toBe(0);
  expect(r.afterThrow.settled).toBe(false); expect(r.afterThrow.chip).toBe(false); expect(r.detail).toContain('→'); expect(r.logged2).toBe(1);
  // a new roll while the reroll is pending: the first values stand and are logged without any →
  const k = await app.run(pd => { pd.reseed(21); pd.state.manualReroll = true; pd.state.notation = '6d6r<=3'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.step(1500);
    const had = pd.rrPending, n0 = pd.bag.log.length; pd.startRoll(false, false); const e = pd.bag.log.length > n0 ? pd.bag.log.at(-1) : null; return { had, n0, n1: pd.bag.log.length, detail: e && e.detail, pendNow: pd.rrPending }; });
  expect(k.had).not.toBeNull(); expect(k.n1).toBe(k.n0 + 1); expect(k.detail).not.toContain('→'); expect(k.pendNow).toBeNull();
});

// PD-212: dice that are not re-thrown are treated like held dice: a bump puts them back, they never ring or reroll
test('reroll bump: a non-rerolled die turned by a bump goes back to its face, no extra ring or reroll', async ({ shared: app }) => {
  await app.reset(21);
  const r = await app.run(pd => {
    pd.state.notation = '6d6r<=3'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.step(1500);
    const first = pd.faces.slice(), pend = pd.rrPending, keep = first.map((_, i) => i).filter(i => !pend.includes(i)); pd.rerollNow();
    const hit = keep.slice(0, 2).map(j => { const b = pd.bodies[j], q = new b.quaternion.constructor(); q.setFromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2); q.mult(b.quaternion, q); b.quaternion.copy(q); b.wakeUp(); return j; });   // a "bump": two kept dice turned onto other faces
    pd.settleRoll(); const e = pd.bag.log.at(-1);
    return { first, pend, keep, hit, final: pd.faces.slice(), orig: pd.rrOrig.map(x => x[0]), detail: e.detail, rings: pd.rrRingCount, pending: pd.rrPending, tries: pd.restoreTries }; });
  expect(r.tries, 'the bump was undone by the restore routine').toBeGreaterThan(0);
  expect(r.hit.length).toBeGreaterThan(0);
  for (const j of r.keep) expect(r.final[j], 'die ' + j).toBe(r.first[j]);
  expect(r.orig.sort()).toEqual(r.pend.slice().sort()); expect(r.rings).toBe(0); expect(r.pending).toBeNull();
  expect(r.detail.split('→').length - 1).toBe(r.pend.length);
});

test('reroll: over 20 seeds the dice that were not re-thrown keep their values; only ringed dice change, once', async ({ shared: app }) => {
  let rerolled = 0;
  for (let seed = 100; seed < 120; seed++) {
    await app.reset(seed);
    const r = await app.run(pd => { pd.state.notation = '4d6r<=2'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.step(1500);
      const first = pd.faces.slice(), pend = pd.rrPending || []; pd.settleRoll(); const e = pd.bag.log.at(-1);
      return { first, pend, final: pd.faces.slice(), orig: pd.rrOrig.map(x => x[0]), detail: e.detail, pending: pd.rrPending }; });
    r.first.forEach((v, i) => { if (!r.pend.includes(i)) expect(r.final[i], `seed ${seed} die ${i}`).toBe(v); });
    expect(r.orig.sort()).toEqual(r.pend.slice().sort()); expect(r.pending).toBeNull();
    expect(r.detail.split('→').length - 1).toBe(r.pend.length); rerolled += r.pend.length;
  }
  expect(rerolled).toBeGreaterThan(0);
});
