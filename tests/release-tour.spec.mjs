// PD-164: the release-only "What's new in 4.1" tour. window.__PD_RELEASE_TOUR='4.1' is injected by build-static.py --artifact --release-tour;
// here an init script sets it. Never active without the flag, and never in a review build (__PD_REVIEW wins).
import { test, expect } from './helpers/app.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const tour = page => page.addInitScript(() => { window.__PD_RELEASE_TOUR = '4.1'; });
const unseen = page => page.evaluate(() => window.__nf.unseen());

test('normal build: no tour', async ({ app, page }) => {
  await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(false);
  await expect(page.locator('.nfdot')).toHaveCount(0);
  expect(await page.evaluate(() => window.__nfEntries.some(f => f.card === "What's new in 4.1"))).toBe(false);
});
test('flag set: six tour entries in the approved order, dots shown', async ({ app, page }) => {
  await tour(page); await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(true);
  expect(await unseen(page)).toEqual(['T1@1', 'T2@1', 'T3@1', 'T4@1', 'T5@1', 'T6@1']);
  await app.nav.toPlay();
  await expect(page.locator('.nfdot:not([hidden])').first()).toBeVisible();
  await page.locator('.nfdot:not([hidden])').first().click();
  await expect(page.locator('.nfbox')).toContainText('Story Dice');
  await expect(page.locator('.nfbox .nfh')).toContainText("What's new in 4.1");
});
test('Prev and Next walk the tour, opening the tab each entry needs', async ({ app, page }) => {
  await tour(page); await app.open(); await app.nav.toPlay();
  await page.locator('.nfdot:not([hidden])').first().click();
  await expect(page.locator('.nfcount')).toHaveText('1 of 6');
  await page.locator('.nfnext').click();
  await expect(page.locator('.nfbox')).toContainText('5d12{noto#1}');
  await page.locator('.nfnext').click();
  await expect(page.locator('.nfbox')).toContainText('Gravity slider');
  await page.locator('.nfprev').click();
  await expect(page.locator('.nfbox')).toContainText('5d12{noto#1}');
  await expect(page.locator('.nfcount')).toHaveText('2 of 6');
});
test('Got it dismisses one; Skip tour dismisses all; both are remembered across a reload', async ({ app, page }) => {
  await tour(page); await app.open(); await app.nav.toPlay();
  await page.locator('.nfdot:not([hidden])').first().click();
  await page.locator('.nfbox .nfgot').click();
  expect((await unseen(page)).length).toBe(5);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  expect((await unseen(page)).length).toBe(5);
  await app.nav.openDrawer();
  await expect(page.locator('#nfall')).toContainText('Skip tour');
  await page.locator('#nfall').click();
  expect(await unseen(page)).toEqual([]);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  expect(await unseen(page)).toEqual([]);
  await expect(page.locator('.nfdot')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('prettydice.tour.4.1'))).toContain('T6@1');
});
test('review build: no tour entries even if the tour flag is also present', async ({ app, page }) => {
  await page.addInitScript(() => { window.__PD_REVIEW = 1; window.__PD_RELEASE_TOUR = '4.1'; });
  await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(true);
  expect(await page.evaluate(() => window.__nfEntries.some(f => f.card === "What's new in 4.1"))).toBe(false);
  await expect(page.locator('#nfall')).toContainText('Seen all');
});
test('build-static: --release-tour writes the tour flag and no review flag; --artifact alone the reverse', async () => {
  const run = args => { execFileSync('python3', ['scripts/build-static.py', ...args], { stdio: 'pipe' }); };
  run(['--artifact', '--release-tour']);
  const rel = readFileSync('dist/pretty-dice-release.html', 'utf8');
  expect(rel).toContain("<script>window.__PD_RELEASE_TOUR='4.1';</script>");
  expect(rel).not.toContain('<script>window.__PD_REVIEW=1');
  run(['--artifact']);
  const rev = readFileSync('dist/pretty-dice-artifact.html', 'utf8');
  expect(rev).toContain('<script>window.__PD_REVIEW=1;');
  expect(rev).not.toContain("<script>window.__PD_RELEASE_TOUR=");
});
