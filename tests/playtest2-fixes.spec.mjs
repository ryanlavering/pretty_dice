// Fixes from agent playtest round 2 (PD-142.14.2.1.*): quick bar errors and modifier before adv, breakdown total, Escape and the bag sheet.
import { test, expect } from './helpers/app.mjs';

test('d20+5 adv and d20-2 dis parse like d20adv+5; adv on a non-d20 still errors (.1)', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const f = s => { const p = pd.parseNotation(s); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod); };
    return { a: f('d20+5 adv'), b: f('d20+5adv'), c: f('d20 adv+5'), d: f('D20-2 DIS'), e: f('d6+5 adv'), g: f('2d20+5 adv') };
  });
  expect(r.a).toBe('2d20kh1+5'); expect(r.b).toBe('2d20kh1+5'); expect(r.c).toBe('2d20kh1+5'); expect(r.d).toBe('2d20kl1-2');
  expect(r.e).toMatch(/^ERR/); expect(r.g).toMatch(/^ERR/);
});

test('the quick bar rolls d20+5 adv, and shows a bad formula as text, not just a red border (.1)', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  const box = page.locator('#qbar input');
  await box.fill('d20+5 adv'); await box.press('Enter');
  await expect(box).not.toHaveClass(/bad/);
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('2d20kh1+5');
  await box.fill('d20+x'); await box.press('Enter');
  await expect(box).toHaveClass(/bad/);
  await expect(page.locator('#qerr')).toBeVisible();
  await expect(page.locator('#qerr')).toContainText("Can't read");
  await box.fill('d'); await expect(page.locator('#qerr')).toBeHidden();   // typing clears it
});

test('a roll with a modifier shows "= total" in the breakdown, like 3d6 does (.4)', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  const box = page.locator('#qbar input');
  await box.fill('d20+3'); await box.press('Enter');
  const tot = page.locator('#result .tot'); await expect(tot).toBeVisible({ timeout: 30_000 });
  const brk = page.locator('#result .brk').first();
  await expect(brk).toContainText(/\+3 = \d+/, { timeout: 30_000 });
  expect(+(await tot.textContent())).toBe(+(await brk.textContent()).match(/= (\d+)/)[1]);
});

test('Escape with the bag sheet open closes only the sheet (.8)', async ({ app, page }) => {
  await app.open();
  await app.nav.openBag();
  await expect(page.locator('#bagsheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bagsheet')).toBeHidden();
  expect(await app.nav.shown('panel'), 'the settings pane stays').toBe(true);
  expect(await page.evaluate(() => document.body.classList.contains('full'))).toBe(false);
});
