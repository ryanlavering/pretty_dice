// PD-142.38.58: the hold-to-look-from-above handle sits in the top-right corner on a phone, clear of the title, status line and corner controls; a touch hold works.
import { test, expect } from './helpers/app.mjs';
test.use({ hasTouch: true, isMobile: true });
const ids = ['name', 'drawerbtn', 'tl', 'tr', 'bagbtn', 'paneopen', 'paneclose'];
for (const w of [360, 390]) test(`the look-from-above handle is top right and overlaps nothing at ${w}px (Design, Play, game, Full view)`, async ({ app }) => {
  await app.page.setViewportSize({ width: w, height: 740 }); await app.open();
  const check = async label => {
    const r = await app.page.evaluate(ids => {
      const box = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
      const h = document.getElementById('stripmid'), hb = box(h), out = { handle: hb, vw: innerWidth, hits: [] };
      const text = e => { const g = document.createRange(); g.selectNodeContents(e); return box(g); };   // the visible text, not the full-width box
      const hit = (id, b) => { if (b.w && b.h && b.l < hb.r - 0.5 && b.r > hb.l + 0.5 && b.t < hb.b - 0.5 && b.b > hb.t + 0.5) out.hits.push(id); };
      for (const id of ids) { const e = document.getElementById(id); if (e && getComputedStyle(e).display !== 'none') hit(id, id === 'name' ? text(e) : box(e)); }
      const gp = document.getElementById('gamepanel'); if (gp && getComputedStyle(gp).display !== 'none') { hit('gamepanel', box(gp)); }
      const res = document.getElementById('result'); if (res) for (const c of res.querySelectorAll('.tot,.brk')) if (c.offsetParent) hit('result', text(c));
      return out;
    }, ids);
    expect(r.handle.r, `${label}: right edge`).toBeGreaterThan(r.vw - 14); expect(r.handle.r).toBeLessThanOrEqual(r.vw); expect(r.handle.t, `${label}: top`).toBeLessThan(12);
    expect(r.handle.w, `${label}: thumb-sized`).toBeGreaterThanOrEqual(44);
    expect(r.hits, `${label}: overlaps`).toEqual([]);
  };
  await app.nav.toDesign(); await check('Design');
  await app.nav.toPlay(); await check('Play');
  await app.run(pd => pd.startGame('yahtzee', ['P1'], {}, [])); await app.page.waitForTimeout(400); await check('game');
  await app.nav.fullView(true); await check('Full view');
});
test('a touch hold on the corner handle looks from above and release returns', async ({ app }) => {
  await app.page.setViewportSize({ width: 390, height: 740 }); await app.open(); await app.nav.toPlay();
  const cdp = await app.page.context().newCDPSession(app.page), b = await app.page.locator('#stripmid').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await expect(app.page.locator('body')).toHaveClass(/peek/);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(app.page.locator('body')).not.toHaveClass(/peek/);
});

// PD-142.38.59 / .60
for (const w of [360, 390]) test(`the leaning and held chips stack at the top right clear of the handle, title and corner buttons at ${w}px; the held chip is the ring gold`, async ({ app }) => {
  await app.page.setViewportSize({ width: w, height: 740 }); await app.open(); await app.nav.toPlay();
  await app.run(pd => { pd.simRoll(); pd.toggleHold(0); const R = document.getElementById('result'); R.classList.add('on'); if (!R.querySelector('.relean:not(.heldnote)')) { const b = document.createElement('button'); b.className = 'relean'; b.textContent = '⚠ Fix 1 leaning die'; R.prepend(b); } });
  const check = async label => {
    const r = await app.page.evaluate(() => {
      const box = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const hit = (a, b) => a.l < b.r - .5 && b.l < a.r - .5 && a.t < b.b - .5 && b.t < a.b - .5;
      const chips = [...document.querySelectorAll('#result .relean')].map(box); const others = {};
      for (const id of ['stripmid', 'drawerbtn', 'tl', 'tr', 'paneopen']) { const e = document.getElementById(id); if (e && getComputedStyle(e).display !== 'none') others[id] = box(e); }
      const nm = document.getElementById('name'), g = document.createRange(); g.selectNodeContents(nm); others.name = box(g);
      const held = document.querySelector('#result .heldnote'), cs = getComputedStyle(held), ring = '#' + (window.__pd.RING_COLORS ? window.__pd.RING_COLORS.hold.toString(16) : 'f2c14e');
      const rgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${n >> 8 & 255}, ${n & 255})`; };
      return { vw: innerWidth, chips, hits: Object.entries(others).flatMap(([k, b]) => chips.some(c => hit(c, b)) ? [k] : []), stacked: chips.length === 2 && !hit(chips[0], chips[1]), color: cs.color, border: cs.borderTopColor, ring: rgb(ring) };
    });
    expect(r.chips.length, label).toBe(2); for (const c of r.chips) { expect(c.r, `${label}: right side`).toBeGreaterThan(r.vw - 14); expect(c.l).toBeGreaterThan(r.vw / 2 - 40); }
    expect(r.stacked, `${label}: stacked, not overlapping`).toBe(true); expect(r.hits, `${label}: overlaps`).toEqual([]);
    expect([r.color, r.border], `${label}: held chip = ring colour`).toEqual([r.ring, r.ring]);
  };
  await check('Play');
  await app.nav.fullView(true); await app.page.waitForTimeout(200); await check('Full view');
});
