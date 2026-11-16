// Owner artifact comments 2026-11-15 (PD-142.38.6-.10): Sound section with basic controls first; Finish labels flush with the slider; Bag button bottom-left in Play;
// Design | Play in the drawer in Full view; the whole dock chip row on desktop.
import { test, expect } from './helpers/app.mjs';
const box = (p, sel) => p.locator(sel).first().boundingBox();
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: Finish end labels line up with the slider ends (.38.7)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign();
    const s = await box(page, '#polish'), m = await box(page, '.slends .ends span:first-child'), g = await box(page, '.slends .ends span:last-child');
    expect(Math.abs(m.x - s.x), 'matte starts at the slider left').toBeLessThanOrEqual(2);
    expect(Math.abs((g.x + g.width) - (s.x + s.width)), 'gloss ends at the slider right').toBeLessThanOrEqual(2);
  });
  test(`${name}: Bag button bottom-left in Play opens the bag and keeps clear of the dock (.38.8)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open();
    await app.nav.toDesign(); await expect(page.locator('#bagbtn')).toBeHidden();
    await app.nav.toPlay(); await app.run(pd => pd.simRoll()); await page.waitForTimeout(300);
    const b = await box(page, '#bagbtn'), q = await box(page, '#qbar'); expect(b, 'the button is on screen in Play').toBeTruthy();
    expect(b.x + b.width <= q.x + 1 || b.y + b.height <= q.y || b.y >= q.y + q.height, 'no overlap with the dock').toBe(true);
    const st = await box(page, '#stage'); expect(b.x - st.x, 'at the left edge of the table').toBeLessThan(80); expect(b.y).toBeGreaterThan(vp.height * 0.3);
    await app.run(pd => pd.bagOps.rename(pd.bag.designs[0].id, 'Renamed')); await expect(page.locator('#bagbtn')).toHaveClass(/dirty/);   // the unsaved-changes dot
    await page.locator('#bagbtn').click();
    await expect(page.locator('#bagsheet')).toBeVisible();
    await expect(page.locator('#tiles')).toBeVisible();
  });
}
test('Full view: the drawer carries Design | Play, and only in Full view (.38.9)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay();
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toBeHidden(); await app.nav.closeDrawer();
  await app.nav.fullView(true);
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toBeVisible(); await expect(page.locator('#roomsw')).toContainText('Design');
  await page.locator('#roomsw').click();
  await expect(page.locator('body')).toHaveClass(/design/);
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toContainText('Play');
});
test('desktop: the dock shows all seven dice and Adv/Dis without scrolling (.38.10)', async ({ app, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await app.open(); await app.nav.toPlay();
  await app.run(pd => pd.simRoll()); await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const c = document.getElementById('qchips'); return { fits: c.scrollWidth <= c.clientWidth + 1, n: c.querySelectorAll('[data-die]').length, adv: c.querySelectorAll('[data-adv]').length }; });
  expect(r.n).toBe(7); expect(r.adv).toBe(2); expect(r.fits, 'no horizontal scroll needed on desktop').toBe(true);
});

test('Keep and Discard for a random draft sit next to Randomize in the Look tab (.38.17)', async ({ app, page }) => {
  await app.open(); await app.nav.toDesign();
  await expect(page.locator('#draftact')).toBeHidden();
  await page.locator('#rand').click();
  await expect(page.locator('#draftact')).toBeVisible();
  const r = await box(page, '#rand'), k = await box(page, '#dkeep'); expect(k.y).toBeLessThan(r.y + 150);
  const n0 = await app.run(pd => pd.bag.designs.length);
  await page.locator('#dkeep').click();
  expect(await app.run(pd => pd.bag.designs.length)).toBe(n0 + 1);
  await expect(page.locator('#draftact')).toBeHidden();
});

test('Raised numbers need a face panel; Patina is disabled without one (.38.14 .38.15)', async ({ app, page }) => {
  await app.open(); await app.nav.toDesign();
  await app.run(pd => { Object.assign(pd.state, { panel: 0, numRaised: true }); });
  await page.locator('#panel').evaluate(e => { e.value = 0; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#numstyle')).toHaveValue('inset');
  await expect(page.locator('#numstyle option[value="raised"]')).toBeDisabled();
  await expect(page.locator('#patina')).toBeDisabled();
  await page.locator('#panel').evaluate(e => { e.value = 0.12; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#numstyle option[value="raised"]')).toBeEnabled();
  await expect(page.locator('#numstyle')).toHaveValue('raised');   // the saved preference returns with the panel
  await expect(page.locator('#patina')).toBeEnabled();
  // a saved look with Raised and no panel loads as Inset, no error
  const ok = await app.run(pd => { const j = pd.designToJSON(); j.relief.panel = 0; j.relief.numbers = 'raised'; return !!j; });
  expect(ok).toBe(true);
});

test('Paint numbers sits with the colour controls (.38.13)', async ({ app, page }) => {
  await app.open(); await app.nav.toDesign();
  const order = await page.evaluate(() => { const ids = [...document.querySelectorAll('#panes [id]')].map(e => e.id); return { a: ids.indexOf('paintmode'), n: ids.indexOf('numpaint'), r: ids.indexOf('panel') }; });
  expect(order.n).toBeGreaterThan(order.a); expect(order.n - order.a).toBeLessThan(4); expect(order.n).toBeLessThan(order.r);
});

for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: the Full view handles overlap no other control (.38.18)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open();
    for (const room of ['toDesign', 'toPlay']) {
      await app.nav[room](); await page.waitForTimeout(250);
      const hit = await page.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const H = document.getElementById('paneclose'), h = H.getBoundingClientRect(), out = [];
        for (const e of document.querySelectorAll('button, input, select, #qbar, #shelf')) { if (e === H || H.contains(e) || e.id === 'paneopen' || !vis(e)) continue; const r = e.getBoundingClientRect(); if (r.left < h.right && h.left < r.right && r.top < h.bottom && h.top < r.bottom) out.push(e.id || e.textContent.trim().slice(0, 12) || e.tagName); }
        return out;
      });
      expect(hit, `${room}: nothing under the Full view handle`).toEqual([]);
    }
    await app.nav.fullView(true);
    const hit2 = await page.evaluate(() => { const O = document.getElementById('paneopen'), h = O.getBoundingClientRect(), out = []; for (const e of document.querySelectorAll('#tools button, #qbar, #shelf, #modesw button, #histrow button')) { const r = e.getBoundingClientRect(); if (r.width && r.left < h.right && h.left < r.right && r.top < h.bottom && h.top < r.bottom) out.push(e.id || e.tagName); } return out; });
    expect(hit2, 'nothing under the open handle in Full view').toEqual([]);
  });
}

test('Table tab also has Shape and Custom set; Look still does; a game hides them (.38.12)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay(); await app.run(pd => pd.simRoll());
  await page.locator('#paneltabs [data-pane=table]').click();
  await expect(page.locator('#shapes')).toBeVisible(); await expect(page.locator('#shapehead')).toBeVisible();
  await page.locator('#shapes button').nth(1).click();
  await expect(page.locator('#sec-dice')).toBeVisible();
  await page.locator('#shapes button', { hasText: /custom/i }).click();
  await expect(page.locator('#customctl')).toBeVisible();
  await expect(page.locator('#panes h2', { hasText: 'Substrate' })).toBeHidden();   // the design controls stay in Look
  await app.nav.toDesign(); await expect(page.locator('#shapes')).toBeVisible();
});

// PD-142.38.22: phone round Design/Play button (also in Full view), desktop switch above the tabs; no overlaps.
for (const [name, vp] of [['phone', { width: 390, height: 780 }], ['desktop', { width: 1280, height: 800 }]]) {
  test(`${name}: the Design | Play control clears Undo/Redo, the Bag button and the pane handles, normal and Full view (.38.22)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign(); await page.waitForTimeout(300);
    const sel = name === 'phone' ? '#roomround' : '#modesw';
    const overlap = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const check = async tag => {
      const me = await page.locator(sel).boundingBox(); expect(me, tag + ': control visible').toBeTruthy();
      for (const o of ['#undo', '#redo', '#paneclose', '#paneopen', '#bagbtn']) { const el = page.locator(o).first(); if (!(await el.count()) || !(await el.isVisible())) continue; expect(overlap(me, await el.boundingBox()), `${tag}: ${sel} overlaps ${o}`).toBeFalsy(); }
    };
    await check('design'); await page.screenshot({ path: `docs/design/screenshots/2026-11-16-38-22-${name}-design.png` });
    await app.nav.toPlay(); await page.waitForTimeout(300); await check('play'); await page.screenshot({ path: `docs/design/screenshots/2026-11-16-38-22-${name}-play.png` });
    await app.nav.fullView(true); await page.waitForTimeout(300);
    if (name === 'phone') { await expect(page.locator('#roomround')).toBeVisible(); await page.locator('#roomround').click(); await expect(page.locator('body')).toHaveClass(/design/); await page.screenshot({ path: `docs/design/screenshots/2026-11-16-38-22-${name}-fullview.png` }); await app.nav.fullView(false); }
    else { await expect(page.locator('#drawerbtn')).toBeVisible(); await app.nav.fullView(false); }
    if (name === 'desktop') { const k = await page.evaluate(() => [...document.querySelector('aside').children].map(e => e.id)); expect(k.indexOf('modesw')).toBeLessThan(k.indexOf('paneltabs')); }
  });
}
