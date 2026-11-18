// PD-142.38.59.1: on desktop the leaning and held chips stack at the top right (like the phone), clear of the total, name, corner buttons and the Design | Play switch.
import { test, expect } from './helpers/app.mjs';
const ids = ['name', 'drawerbtn', 'tl', 'tr', 'bagbtn', 'paneopen', 'paneclose', 'modesw', 'qbar'];
for (const [w, h] of [[960, 600], [1280, 800], [1920, 1080]]) for (const full of [false, true]) test(`desktop ${w}x${h}${full ? ' Full view' : ''}: leaning and held chips sit at the right and overlap nothing`, async ({ app }) => {
  await app.page.setViewportSize({ width: w, height: h }); await app.open(); await app.nav.toPlay(); if (full) await app.nav.fullView(true);
  await app.run(pd => { pd.simRoll(); pd.toggleHold(0); const R = document.getElementById('result'); R.classList.add('on'); if (!R.querySelector('.relean:not(.heldnote)')) { const b = document.createElement('button'); b.className = 'relean'; b.textContent = '⚠ Fix 1 leaning die'; R.prepend(b); } });
  await app.page.waitForTimeout(500);
  const r = await app.page.evaluate(ids => {
    const box = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    const text = e => { const g = document.createRange(); g.selectNodeContents(e); return box(g); };
    const stage = box(document.getElementById('stage')), chips = [...document.querySelectorAll('#result .relean')].map(box), hits = [];
    const hit = (id, b, c, i) => { if (b.w && b.h && b.l < c.r - 0.5 && b.r > c.l + 0.5 && b.t < c.b - 0.5 && b.b > c.t + 0.5) hits.push(id + ' x chip' + i); };
    chips.forEach((c, i) => {
      for (const id of ids) { const e = document.getElementById(id); if (e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden') hit(id, id === 'name' ? text(e) : box(e), c, i); }
      for (const e of document.querySelectorAll('#result .tot,#result .brk')) if (e.offsetParent) hit('result', text(e), c, i);
      if (i) hit('chip0', chips[0], c, i);
    });
    return { stage, chips, hits };
  }, ids);
  expect(r.chips.length, 'a leaning and a held chip').toBe(2);
  for (const c of r.chips) { expect(c.l, 'right half of the table').toBeGreaterThan(r.stage.l + (r.stage.r - r.stage.l) / 2); expect(c.r, 'inside the table').toBeLessThanOrEqual(r.stage.r); expect(c.t).toBeGreaterThanOrEqual(r.stage.t); }
  expect(r.chips[1].t, 'stacked below').toBeGreaterThan(r.chips[0].t);
  expect(r.hits).toEqual([]);
});
