// PD-20.3: the app must start without the network. (1) CDN unreachable -> the vendor/ copies are used.
// (2) The single-file offline build loads from file:// and makes no network request at all.
// These use the plain Playwright test (not the shared fixture, which forces ?libs=local).
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

const bootErrors = page => { const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  return errors; };

const drawn = page => page.evaluate(() => {   // something was rendered: dice exist and the canvas is not blank
  const pd = window.__pd; pd.pause(); pd.renderOnce();
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.drawImage(pd.canvas, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data; let min = 255, max = 0; for (let i = 0; i < d.length; i += 4) { min = Math.min(min, d[i + 1]); max = Math.max(max, d[i + 1]); }
  return { dice: pd.dice.length, spread: max - min }; });

test('CDN blocked: the page falls back to vendor/ and renders', async ({ page }) => {
  const errors = bootErrors(page), cdnHits = [];
  await page.route(/cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/, route => { cdnHits.push(route.request().url()); route.abort(); });
  await page.goto('/index.html');   // no ?libs=, so the loader probes the CDN itself
  await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__libs)).toBe('local');
  expect(cdnHits.length, 'the loader did try the CDN first').toBeGreaterThan(0);
  const r = await drawn(page);
  expect(r.dice).toBeGreaterThan(0); expect(r.spread, 'canvas is not blank').toBeGreaterThan(20);
  // aborted font/CDN requests show up as failed network loads, not as app errors
  expect(errors.filter(e => !/ERR_FAILED|Failed to load resource/.test(e))).toEqual([]);
});

test.describe('single-file offline build', () => {
  test.beforeAll(() => { execFileSync('python3', ['scripts/build-static.py'], { cwd: root, stdio: 'pipe' }); });

  test('loads from file:// with the network off and makes no web request', async ({ page, context }) => {
    const errors = bootErrors(page), web = [];
    await context.setOffline(true);
    page.on('request', r => { if (/^https?:/.test(r.url())) web.push(r.url()); });
    await page.goto(pathToFileURL(path.join(root, 'dist/pretty-dice-offline.html')).href);
    await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
    expect(web, 'no http(s) request').toEqual([]);
    const r = await drawn(page);
    expect(r.dice).toBeGreaterThan(0); expect(r.spread, 'canvas is not blank').toBeGreaterThan(20);
    expect(errors).toEqual([]);
  });
});
