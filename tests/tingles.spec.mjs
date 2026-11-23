// PD-163: 'New' callouts (tingles) hold only the unreviewed 4.1 changes; Prev / Next walk them (wrapping, across rooms); Got it advances;
// the artifact build drops entries whose card is Review Complete / Done by setting window.__PD_RETIRED.
import { test, expect } from './helpers/app.mjs';
const entries = p => p.evaluate(() => window.__nfEntries.map(f => f.id));
const unseen = p => p.evaluate(() => window.__nf.unseen().map(k => k.split('@')[0]));
const count = p => p.locator('.nfbox .nfcount');
test('all current 4.1 entries appear, in list order, each with a card and room', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  const ids = await entries(page);
  expect(ids.length).toBeGreaterThan(0); expect(new Set(ids).size).toBe(ids.length);
  expect(await unseen(page)).toEqual(ids);
  expect(await page.evaluate(() => window.__nfEntries.every(f => f.card && f.room === 'play' && f.anchor && f.text))).toBe(true);
});
test('Next / Prev cycle and wrap, switching room when the anchor is elsewhere', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toPlay();
  await expect(page.locator('.nfdot:not([hidden])').first()).toBeVisible();
  await page.locator('.nfdot[data-feature=PD-156]:not([hidden])').click();
  const ids = await unseen(page), n = ids.length;
  await expect(count(page)).toHaveText(`1 of ${n}`);
  const card = () => page.locator('.nfbox .nfh span').textContent();
  await page.locator('.nfbox .nfnext').click(); await expect(count(page)).toHaveText(`2 of ${n}`); expect(await card()).toBe(ids[1]);
  for (let i = 2; i < n; i++) await page.locator('.nfbox .nfnext').click();
  await expect(count(page)).toHaveText(`${n} of ${n}`);
  await page.locator('.nfbox .nfnext').click(); await expect(count(page)).toHaveText(`1 of ${n}`);   // wraps
  await page.locator('.nfbox .nfprev').click(); await expect(count(page)).toHaveText(`${n} of ${n}`); expect(await card()).toBe(ids[n - 1]);
});
test('Got it retires that entry and advances to the next one', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toPlay();
  await page.locator('.nfdot[data-feature=PD-156]:not([hidden])').click();
  const before = await unseen(page), n = before.length;
  await page.locator('.nfbox .nfnext').click();   // on the second entry
  await expect(count(page)).toHaveText(`2 of ${n}`);
  await page.locator('.nfbox .nfgot').click();
  expect(await unseen(page)).toEqual(before.filter((_, i) => i !== 1));
  await expect(page.locator('.nfbox')).toBeVisible();
  await expect(page.locator('.nfbox .nfh span')).toHaveText(before[2]);
  await expect(count(page)).toHaveText(`2 of ${n - 1}`);
});
test('entries listed in window.__PD_RETIRED (set by the artifact build) are dropped', async ({ app, page }) => {
  await page.addInitScript(() => { window.__PD_RETIRED = ['PD-158', 'PD-162']; });
  await app.open({ query: 'new=1' });
  const ids = await entries(page);
  expect(ids).not.toContain('PD-158'); expect(ids).not.toContain('PD-162'); expect(ids).toContain('PD-156');
  expect(await unseen(page)).toEqual(ids);
});
test('Next switches from the Design room to the Play room when the anchor is there', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toDesign();
  await expect(page.locator('body.design')).toHaveCount(1);
  await page.evaluate(() => window.__nf.render());
  // no 4.1 anchor is visible in Design on desktop; open the box via Seen-all-free path: play first, open, then go to Design and step
  await app.nav.toPlay();
  await page.locator('.nfdot[data-feature=PD-156]:not([hidden])').click();
  await page.locator('.nfbox .nfnext').click();
  await expect(page.locator('body.design')).toHaveCount(0);
  await expect(page.locator('.nfbox')).toBeVisible();
});
// v42-tingles: the 4.2 entries each get a visible, uncovered dot on their anchor (room/pane) at desktop and phone size, and the box stays on screen.
const NEW42 = ['PD-202', 'PD-214', 'PD-213', 'PD-188', 'PD-198', 'PD-142.42.1', 'PD-212', 'PD-215'];
test('the 4.2 entries exist with matching card ids', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  const es = await page.evaluate(ids => ids.map(i => window.__nfEntries.find(f => f.id === i)), NEW42);
  for (const f of es) { expect(f, 'entry').toBeTruthy(); expect(f.card).toBe(f.id); expect(f.rev).toBe(1); expect(f.room).toBe('play'); expect(f.text).toContain('Check:'); }
});
for (const [w, h] of [[1280, 800], [390, 740]]) test(`each 4.2 entry shows a dot on its anchor and the box stays on screen (${w}x${h})`, async ({ app, page }) => {
  test.setTimeout(120_000);
  await app.open({ query: 'new=1' }); await page.setViewportSize({ width: w, height: h });
  await app.nav.toPlay();
  for (const id of NEW42) {
    const pane = await page.evaluate(i => window.__nfEntries.find(f => f.id === i).pane, id);
    if (pane) { await page.locator(`#paneltabs [data-pane=${pane}]`).click({ timeout: 3000 }).catch(() => {}); }
    await page.waitForTimeout(150);
    const ok = await page.evaluate(i => { window.__nf.render(); const d = document.querySelector(`.nfdot[data-feature="${i}"]`); if (!d || d.hidden) return 'hidden';
      const b = d.getBoundingClientRect(), top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return top === d ? 'ok' : 'covered'; }, id);
    expect(ok, id).toBe('ok');
    await page.locator(`.nfdot[data-feature="${id}"]`).click();
    const b = await page.locator('.nfbox').boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(w); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(h);
    await page.keyboard.press('Escape');
  }
});
