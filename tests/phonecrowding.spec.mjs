// Phone crowding with many dice (PD-142.40): breakdown, lean/held chips and the quick roll bar stay inside 360 px.
import { test, expect } from './helpers/app.mjs';

test('20d4 on a 360x640 phone: breakdown, chips and quick roll bar stay on screen and do not overlap', async ({ app, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await app.open();
  await app.run(pd => { pd.state.notation = '20d4'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.simRoll();
});   // the chips are then added by hand below, whatever the physics did
  await page.evaluate(() => { const R = document.getElementById('result'); if (!R.querySelector('.relean:not(.heldnote)')) { const b = document.createElement('button'); b.className = 'relean'; b.textContent = '⚠ 2 leaning · Re-roll'; R.append(b); } });
  const r = await page.evaluate(() => {
    const W = innerWidth, box = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const brk = document.querySelector('#result .brk'), chips = [...document.querySelectorAll('#result .relean')].map(box), q = document.querySelector('#qbar');
    const kids = [...q.children].map(box), qb = box(q);
    const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    return { W, brk: brk && box(brk), chips, qb, kidsInside: kids.every(k => k.l >= qb.l - 1 && k.r <= qb.r + 1), chipOverlap: chips.some((a, i) => chips.some((b, j) => j > i && overlap(a, b))), docW: document.documentElement.scrollWidth };
  });
  expect(r.brk.l).toBeGreaterThanOrEqual(0); expect(r.brk.r).toBeLessThanOrEqual(r.W);
  expect(r.qb.l).toBeGreaterThanOrEqual(0); expect(r.qb.r).toBeLessThanOrEqual(r.W); expect(r.kidsInside).toBe(true);
  expect(r.chips.length).toBeGreaterThan(0); for (const c of r.chips) { expect(c.l).toBeGreaterThanOrEqual(0); expect(c.r).toBeLessThanOrEqual(r.W); }
  expect(r.chipOverlap).toBe(false); expect(r.docW).toBeLessThanOrEqual(r.W);
  await page.screenshot({ path: 'test-results/phone-crowding-20d4-360x640.png' });
});
