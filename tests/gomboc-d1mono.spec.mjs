// Experimental d1mono (v42-gomboc-die): formula token, candidate sets, mixed rolls, and the three short-of-S outcomes:
// clear-area stall (purple ring, stays until an explicit re-roll), settled against the mat edge (lean), settled against another die (lean).
import { test, expect } from './helpers/app.mjs';

const POSE = `
  const pd = window.__pd, Q = pd.camera.quaternion.constructor, V3 = pd.camera.position.constructor;
  const sDown = i => { const d = pd.dice[i], q = new Q(); q.setFromUnitVectors(d.faces[d.sIdx].n.clone().normalize(), new V3(0, -1, 0)); return q; };
  const put = (i, x, z, q) => { const b = pd.bodies[i]; b.position.set(x, pd.TABLE_Y + 1.3, z); if (q) b.quaternion.set(q.x, q.y, q.z, q.w); else b.quaternion.set(0.2, 0.3, 0.1, 0.9); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); pd.gombocPin(i, true); };`;
const setup = (notation) => `${POSE} pd.state.shape = 'custom'; pd.state.notation = ${JSON.stringify(notation)}; pd.state.manualReroll = false; pd.buildDice(); pd.reseed(1); pd.startRoll();`;

test('d1mono is a formula token (d1 stays free), with candidate-set blocks', async ({ app, page }) => {
  await app.open({ query: 'gomboc' });
  const r = await page.evaluate(() => {
    const ok = {}, bad = {}; const pd = window.__pd;
    for (const s of ['d1mono', '2d6+d1mono', '3d1mono', 'd1mono{lp#4}', '2d1mono{lp#4!ordered}+d20', 'd1mono{lp}', 'd1mono{lp!ordered}']) { const p = pd.parseNotation(s, true); ok[s] = p.error || pd.fmtNotation(p.terms, p.mod, p.group); }
    for (const s of ['d1', 'd1mono{lp#999}', 'd1mono{zz#1}', 'd1mono{lp#4!x}', 'd1monokh1']) bad[s] = !!pd.parseNotation(s, true).error;
    return { ok, bad };
  });
  expect(r.ok).toEqual({ d1mono: '1d1mono', '2d6+d1mono': '2d6+1d1mono', '3d1mono': '3d1mono', 'd1mono{lp#4}': '1d1mono{lp#4}', '2d1mono{lp#4!ordered}+d20': '2d1mono{lp#4!ordered}+1d20', 'd1mono{lp}': '1d1mono{lp}', 'd1mono{lp!ordered}': '1d1mono{lp!ordered}' });
  expect(Object.values(r.bad).every(Boolean)).toBe(true);
});

test('d1mono is rejected in a default build (no flag)', async ({ app, page }) => {
  await app.open();
  expect(await page.evaluate(() => window.__pd.parseNotation('d1mono', true).error)).toMatch(/experimental/);
});

test('mixed formula with candidate dice rolls: each d1mono reads 1 on S, ordered run uses consecutive candidates, farm ids shown', async ({ app, page }) => {
  await app.open({ query: 'gomboc' });
  const r = await page.evaluate(() => {
    const pd = window.__pd; pd.state.shape = 'custom'; pd.state.notation = '2d1mono{lp#4!ordered}+d1mono+d6'; pd.buildDice(); pd.reseed(5);
    const x = pd.simRoll({ maxSteps: 4000, rerolls: 3 });
    return { names: pd.dice.map(d => d.name), farm: pd.dice.map(d => d.farmId), faces: pd.dice.map(d => d.faces.length), result: x.result };
  });
  expect(r.names).toEqual(['d1mono', 'd1mono', 'd1mono', 'd6']);
  expect(r.farm.slice(0, 2)).toEqual(['005', '006']);   // lp#4, lp#5 are the 5th and 6th lines of the farm file
  expect(r.faces[0]).toBe(62); expect(r.faces[2]).toBe(172);
  expect(r.result).toContain('[farm 005,006]');
});

test('stall in a clear area: purple ring, no automatic re-throw even with Manual rerolls off, explicit re-roll works', async ({ app, page }) => {
  await app.open({ query: 'shape=gomboc172' });
  const r = await page.evaluate(`(() => { ${setup('d1mono')} pd.gombocCapS = 6; put(0, 0, 0); pd.step(900);
    const a = { stall: pd.rrStall, manual: pd.rrManual, pending: pd.rrPending, touch: pd.gombocTouching(0), settled: pd.settled, leans: pd.leans, chip: document.querySelector('#result .rrchip')?.textContent };
    for (let k = 0; k < 400; k++) pd.renderOnce(1 / 20);   // 20 s of live-loop time (the ring pulse runs): the ring stays, nothing re-throws it
    const b = { stall: pd.rrStall, pending: pd.rrPending };
    pd.gombocPin(0, false); pd.gombocCapS = 60; pd.rerollNow(); pd.step(4000);
    return { a, b, after: { stall: pd.rrStall, pending: pd.rrPending, faces: pd.faces } }; })()`);
  expect(r.a).toMatchObject({ stall: true, manual: true, pending: [0], touch: null, settled: true });
  expect(r.a.chip).toContain('Stalled below simulation threshold');
  expect(r.b).toEqual({ stall: true, pending: [0] });
  expect(r.after.pending === null || r.after.faces[0] === 1 || r.after.stall).toBe(true);
});

test('settled short of S against the mat edge: declared a lean early (regular lean processing: topple attempt), no stall ring', async ({ app, page }) => {
  await app.open({ query: 'shape=gomboc172' });
  const r = await page.evaluate(`(() => { ${setup('d1mono')} pd.gombocCapS = 60; const hx = pd.rollHalf.x; put(0, hx - 0.4, 0); let touch = null;
    for (let k = 0; k < 60 && !pd.settled && pd.freeTries < 1; k++) { pd.step(30); touch = pd.gombocTouching(0) || touch; }
    return { touch, rollT: pd.rollT, freeTries: pd.freeTries, stall: pd.rrStall, pending: pd.rrPending }; })()`);
  expect(r.touch).toBe('wall');
  expect(r.freeTries).toBe(1);        // finishRoll saw a lean (the lone-lean topple attempt) ...
  expect(r.rollT).toBeLessThan(15);   // ... long before the 60 s cap
  expect(r.stall).toBe(false); expect(r.pending).toBeNull();
});

test('settled short of S against another die: declared a lean early', async ({ app, page }) => {
  await app.open({ query: 'gomboc' });
  const r = await page.evaluate(`(() => { ${setup('2d1mono')} pd.gombocCapS = 60; put(1, 0, 0, sDown(1)); put(0, 1.3, 0); pd.step(900);
    return { touch0: pd.gombocTouching(0), settled: pd.settled, rollT: pd.rollT, leans: pd.leans, stall: pd.rrStall }; })()`);
  expect(r.touch0).toBe('die'); expect(r.settled).toBe(true); expect(r.rollT).toBeLessThan(15);
  expect(r.leans[0]).toBe(true); expect(r.stall).toBe(false);
});
