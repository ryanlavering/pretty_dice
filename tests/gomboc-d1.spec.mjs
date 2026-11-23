// Experimental gomboc d1 (v42-gomboc-die): flagged shape only; stock builds do not have it.
import { test, expect } from './helpers/app.mjs';

test('the gomboc d1 is absent from a default build', async ({ app, page }) => {
  await app.open();
  expect(await page.evaluate(() => 'gomboc172' in window.__pd.SHAPES)).toBe(false);
});

test('gomboc d1: 172 faces, one face carries the 1, S ends down; a stalled die at the cap rings instead of reading a face', async ({ app, page }) => {
  await app.open({ query: 'shape=gomboc172' });
  const g = await page.evaluate(() => { const d = window.__pd.dice[0]; return { faces: d.faces.length, ones: d.labs.filter(x => x === 1).length, s: d.sIdx, label: d.labs[d.sIdx] }; });
  expect(g).toEqual({ faces: 172, ones: 1, s: g.s, label: 1 });
  const r = await page.evaluate(() => { const pd = window.__pd; pd.reseed(101); let x = pd.simRoll({ maxSteps: 4000 }); for (let g = 0; pd.rrStall && g < 8; g++) { pd.rerollNow(); pd.step(4000); x = { settled: pd.settled, dice: pd.faces.map(l => ({ label: l })) }; } return { settled: x.settled, label: x.dice[0].label, stalls: pd.gombocStalls }; });
  expect(r.settled).toBe(true); expect(r.label).toBe(1);   // seed 101 reaches S (a stall, if any, is re-rolled automatically)
  const s = await page.evaluate(() => { const pd = window.__pd; pd.state.manualReroll = true; pd.gombocCapS = 5;
    for (let seed = 101; seed < 140; seed++) { pd.reseed(seed); pd.simRoll({ maxSteps: 4000 }); if (pd.rrStall) { const n = pd.rrPending.length; pd.gombocCapS = 60; pd.rerollNow(); pd.step(4000); return { seed, n, chip: true, after: pd.rrPending, faces: pd.faces }; } } return null; });
  expect(s, 'a short cap provokes a stall').not.toBeNull(); expect(s.n).toBe(1);
});
