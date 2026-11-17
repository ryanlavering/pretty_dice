// PD-142.38.3: 'New' callouts. Review builds only (?new=1 here; the artifact build sets __PD_REVIEW). A pulsing dot on the control; press it for the comment;
// tapping the dot / header / outside / Esc collapses it and keeps it unseen; 'Got it' and 'Seen all' retire it, and that persists across a reload.
import { test, expect } from './helpers/app.mjs';
const dots = p => p.locator('.nfdot:not([hidden])');
test('review flag off: nothing is rendered', async ({ app, page }) => {
  await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(false);
  await expect(page.locator('.nfdot')).toHaveCount(0);
  await expect(page.locator('#nfall')).toHaveCount(0);
});
test('dot expands to the comment, collapse keeps it unseen, Got it retires and persists', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toDesign();
  await expect(dots(page).first()).toBeVisible();
  const n0 = (await page.evaluate(() => window.__nf.unseen())).length; expect(n0).toBeGreaterThan(2);
  const d = dots(page).first(); await d.click();
  await expect(page.locator('.nfbox')).toBeVisible();
  await expect(page.locator('.nfbox .nfgot')).toBeVisible();
  await page.keyboard.press('Escape');                                   // collapse, not retire
  await expect(page.locator('.nfbox')).toBeHidden();
  expect((await page.evaluate(() => window.__nf.unseen())).length).toBe(n0);
  await dots(page).first().click(); await page.locator('.nfbox .nfh').click();   // header collapses too
  await expect(page.locator('.nfbox')).toBeHidden();
  await dots(page).first().click(); await page.locator('.nfbox .nfgot').click();   // Got it retires
  await expect(page.locator('.nfbox')).toBeHidden();
  expect((await page.evaluate(() => window.__nf.unseen())).length).toBe(n0 - 1);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  expect((await page.evaluate(() => window.__nf.unseen())).length).toBe(n0 - 1);
});
test('Seen all in the drawer retires everything', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.openDrawer();
  await expect(page.locator('#nfall')).toContainText('new');
  await page.locator('#nfall').click();
  expect(await page.evaluate(() => window.__nf.unseen())).toEqual([]);
  await expect(page.locator('.nfdot')).toHaveCount(0);
});
test('the overlay stays inside the phone viewport', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await page.setViewportSize({ width: 390, height: 780 });
  await expect(dots(page).first()).toBeVisible();
  await dots(page).last().click();
  const b = await page.locator('.nfbox').boundingBox();
  expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(390); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(780);
});
test('only the post-v19 entries remain; the owner-reviewed ones are retired (PD-142.38.31)', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  const ids = (await page.evaluate(() => window.__nf.unseen())).map(k => k.split('@')[0]);
  for (const gone of ['PD-142.38.s4', 'PD-142.38.s5', 'PD-142.38.s6', 'PD-142.38.s7', 'PD-142.38.s8', 'PD-142.38.4', 'PD-142.38.5', 'PD-142.33.1', 'PD-142.39.1', 'PD-142.38.drawer']) expect(ids).not.toContain(gone);
  for (const here of ['PD-142.38.22', 'PD-142.38.23', 'PD-142.38.32', 'PD-142.38.35', 'PD-142.38.37', 'PD-142.38.17', 'PD-142.38.21', 'PD-142.38.14', 'PD-142.38.25', 'PD-142.38.28', 'PD-142.38.42']) expect(ids).toContain(here);
});
// PD-142.38.42: every unseen entry must have a dot somewhere (some room/tab/state, phone and desktop), none covered, and the drawer label explains the rest.
for (const [w, h] of [[390, 740], [1280, 800]]) test(`every unseen callout has a findable dot somewhere, and the count label says how many are here (${w})`, async ({ app, page }) => {
  test.setTimeout(150_000);
  await app.open({ query: 'new=1' }); await page.setViewportSize({ width: w, height: h });
  const found = {}, covered = [];
  const snap = async tag => {
    const r = await page.evaluate(() => { window.__nf.render(); const res = [];
      for (const k of window.__nf.unseen()) { const id = k.split('@')[0], f = window.__nfEntries.find(e => e.id === id);
        let t = [...document.querySelectorAll(f.anchor)].find(x => x.getBoundingClientRect().width > 0) || document.querySelector(f.anchor);
        if (t && t.closest('#dmenu') && !document.getElementById('drawer').classList.contains('open')) t = document.getElementById('drawerbtn');
        if (!t) continue; t.scrollIntoView({ block: 'center' }); window.__nf.render();
        const d = document.querySelector(`.nfdot[data-feature="${id}"]`); if (!d || d.hidden) continue;
        const b = d.getBoundingClientRect(), top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); res.push([id, top === d]); }
      return res; });
    for (const [id, ok] of r) { (found[id] ||= []).push(tag); if (!ok) covered.push(id + ' @' + tag); }
  };
  for (const room of ['design', 'play']) {
    await (room === 'design' ? app.nav.toDesign() : app.nav.toPlay());
    for (const t of await page.locator('#paneltabs [role=tab]:visible').evaluateAll(a => a.map(b => b.dataset.pane))) {
      await page.locator(`#paneltabs [data-pane=${t}]`).click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); await snap(room + '/' + t);
      if (t === 'look' || t === 'table') { await page.locator('#shapes button[data-id=custom]').click(); await page.waitForTimeout(500); await snap(room + '/' + t + '+custom'); }
      if (t === 'look') { await page.locator('#rand').click(); await page.waitForTimeout(300); await snap(room + '/look+draft'); }
      await page.keyboard.press('Escape'); }
    await app.nav.openDrawer(); await snap(room + '/drawer');
    const label = await page.locator('#nfall').textContent(), un = (await page.evaluate(() => window.__nf.unseen())).length;
    expect(label).toMatch(new RegExp(`^Seen all \\(${un} new(, \\d+ on this screen)?\\)$`));
    await app.nav.closeDrawer();
  }
  const un = (await page.evaluate(() => window.__nf.unseen())).map(k => k.split('@')[0]);
  expect(un.filter(id => !found[id]), 'entries with no screen state that shows their dot').toEqual([]);
  expect(covered, 'dots covered by another element').toEqual([]);
});
test('the drawer label counts the dots on this screen separately', async ({ app, page }) => {
  await app.open({ query: 'new=1' }); await app.nav.toPlay();
  await app.nav.openDrawer();
  const un = (await page.evaluate(() => window.__nf.unseen())).length, here = await page.locator('.nfdot:not([hidden])').count();
  expect(here).toBeLessThan(un);   // Design-only entries are on the other room
  await expect(page.locator('#nfall')).toHaveText(`Seen all (${un} new, ${here} on this screen)`);
});
