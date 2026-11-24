// PD-164: the release-only "What's new in 4.2" tour. window.__PD_RELEASE_TOUR='4.2' is injected by build-static.py --artifact --release-tour;
// here an init script sets it. Never active without the flag, and never in a review build (__PD_REVIEW wins).
import { test, expect } from './helpers/app.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const tour = page => page.addInitScript(() => { window.__PD_RELEASE_TOUR = '4.2'; });
// dots are positioned by a 400 ms render tick, so which dot is first in view varies: always address the entry by id
const dot = (page, id) => page.locator(`.nfdot[data-feature=${id}]:not([hidden])`);
const unseen = page => page.evaluate(() => window.__nf.unseen());

test('normal build: no tour', async ({ app, page }) => {
  await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(false);
  await expect(page.locator('.nfdot')).toHaveCount(0);
  expect(await page.evaluate(() => window.__nfEntries.some(f => f.card === "What's new in 4.2"))).toBe(false);
});
test('flag set: four tour entries in the approved order, dots shown', async ({ app, page }) => {
  await tour(page); await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(true);
  expect(await unseen(page)).toEqual(['T1@2', 'T2@1', 'T3@1', 'T4@1']);
  await app.nav.toPlay();
  await expect(dot(page, 'T1')).toBeVisible();
  await dot(page, 'T1').click();
  await expect(page.locator('.nfbox')).toContainText('Designs are looks');
  await expect(page.locator('.nfbox .nfh')).toContainText("What's new in 4.2");
});
test('Prev and Next walk the tour, opening the tab each entry needs', async ({ app, page }) => {
  await tour(page); await app.open(); await app.nav.toPlay();
  await expect(dot(page, 'T1')).toBeVisible();
  await dot(page, 'T1').click();
  await expect(page.locator('.nfcount')).toHaveText('1 of 4');
  await page.locator('.nfnext').click();
  await expect(page.locator('.nfbox')).toContainText('lobby');
  await page.locator('.nfnext').click();
  await expect(page.locator('.nfbox')).toContainText('Rerolls like d20r1');
  await page.locator('.nfprev').click();
  await expect(page.locator('.nfbox')).toContainText('lobby');
  await expect(page.locator('.nfcount')).toHaveText('2 of 4');
});
test('Got it dismisses one; Skip tour dismisses all; both are remembered across a reload', async ({ app, page }) => {
  await tour(page); await app.open(); await app.nav.toPlay();
  await expect(dot(page, 'T1')).toBeVisible();
  await dot(page, 'T1').click();
  await page.locator('.nfbox .nfgot').click();
  expect((await unseen(page)).length).toBe(3);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  expect((await unseen(page)).length).toBe(3);
  await app.nav.openDrawer();
  await expect(page.locator('#nfall')).toHaveText("What's new (3)");   // PD-203: the entry resumes the tour; Skip tour is the double-click link in the callout
  await page.locator('#nfall').click();
  await expect(page.locator('.nfbox')).toContainText('lobby');
  await page.locator('.nfbox .nfclear').click();
  await expect(page.locator('.nfhint')).toHaveText('Double-tap to skip the tour');
  expect(await unseen(page)).toHaveLength(3);
  await page.locator('.nfbox .nfclear').dblclick();
  expect(await unseen(page)).toEqual([]);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  expect(await unseen(page)).toEqual([]);
  await expect(page.locator('.nfdot')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('prettydice.tour.4.2'))).toContain('T4@1');
});
test('review build: no tour entries even if the tour flag is also present', async ({ app, page }) => {
  await page.addInitScript(() => { window.__PD_REVIEW = 1; window.__PD_RELEASE_TOUR = '4.2'; });
  await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(true);
  expect(await page.evaluate(() => window.__nfEntries.some(f => f.card === "What's new in 4.2"))).toBe(false);
  await expect(page.locator('#nfall')).toContainText("What's new");
});
test('build-static: --release-tour writes the tour flag and no review flag; --artifact alone the reverse', async () => {
  const run = args => { execFileSync('python3', ['scripts/build-static.py', ...args], { stdio: 'pipe' }); };
  run(['--artifact', '--release-tour']);
  const rel = readFileSync('dist/pretty-dice-release.html', 'utf8');
  expect(rel).toContain("<script>window.__PD_RELEASE_TOUR='4.2';</script>");
  expect(rel).not.toContain('<script>window.__PD_REVIEW=1');
  run(['--artifact']);
  const rev = readFileSync('dist/pretty-dice-artifact.html', 'utf8');
  expect(rev).toContain('<script>window.__PD_REVIEW=1;');
  expect(rev).not.toContain("<script>window.__PD_RELEASE_TOUR=");
});
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 740 }]]) {
  test(`every entry opens its callout by id on ${name}`, async ({ app, page }) => {
    await page.setViewportSize(vp); await tour(page); await app.open(); await app.nav.toPlay();
    const want = { T1: 'Designs are looks', T2: 'lobby', T3: 'Rerolls like d20r1', T4: 'settle without twitching' };
    for (const id of Object.keys(want)) {
      if (id === 'T1') { await expect(dot(page, id)).toBeVisible(); await dot(page, id).click(); }
      else await page.locator('.nfnext').click();   // an open callout can cover the next dot on a phone
      await expect(page.locator('.nfbox')).toContainText(want[id]);
      const b = await page.locator('.nfbox').boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
    }
  });
}
