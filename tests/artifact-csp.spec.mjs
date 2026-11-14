// PD-142.35: the artifact build must start under the claude.ai artifact CSP (script-src limited to the CDNs, so no data: scripts).
// Hermetic: the page is served from memory with the CSP header and the CDN requests are answered from vendor/.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const CSP = "script-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com";
const vendorFor = url => {   // the CDN URLs of the artifact import map -> the vendored copies
  const p = new URL(url).pathname;
  let m;
  if ((m = p.match(/^\/npm\/three@[\d.]+\/(build|examples\/jsm)\/(.+)$/))) return path.join(root, 'vendor/three', m[1], m[2]);
  if ((m = p.match(/^\/npm\/cannon-es@[\d.]+\/(.+)$/))) return path.join(root, 'vendor/cannon-es', m[1]);
  return null;
};

test('the artifact build boots under a CDN-only script CSP and starts a game', async ({ page }) => {
  execFileSync('python3', [path.join(root, 'scripts/build-static.py'), '--artifact'], { cwd: root });
  const html = fs.readFileSync(path.join(root, 'dist/pretty-dice-artifact.html'), 'utf8');
  expect(html).not.toContain('data:text/javascript');                      // no data: script at all (blocked by the artifact CSP)

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {   // expected and harmless here: the font stylesheet the test aborts, and the CSP blocking the blob: watchdog worker (it only costs the hang report)
    const benign = /fonts\.(googleapis|gstatic)\.com/.test(m.location().url || '') || /worker/i.test(m.text());
    if (m.type() === 'error' && !benign) errors.push(m.text());
  });
  await page.route('https://artifact.test/', r => r.fulfill({ status: 200, contentType: 'text/html', headers: { 'Content-Security-Policy': CSP }, body: html }));
  await page.route('https://cdn.jsdelivr.net/**', r => {
    const file = vendorFor(r.request().url());
    if (!file || !fs.existsSync(file)) return r.fulfill({ status: 404, body: 'not vendored' });
    r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(file) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

  await page.goto('https://artifact.test/');
  await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });

  expect(errors, 'no pageerror, no CSP refusal other than the blob: worker').toEqual([]);

  // a game starts and the engine answers (the engine is bundled into the page, not imported)
  await page.evaluate(() => window.__pd.openGames());
  await page.selectOption('#gamepanel select >> nth=0', 'yahtzee');
  await page.click('#gamepanel button.big');
  const st = await page.evaluate(() => window.__pd.GAMES.status(window.__pd.game.state));
  expect(st).toMatchObject({ phase: 'roll', round: 1, rollsUsed: 0 });
  await page.evaluate(() => window.__pd.simRoll());
  expect(await page.evaluate(() => window.__pd.GAMES.status(window.__pd.game.state).rollsUsed)).toBe(1);
});

test('the offline build still boots from file:// with the engine in the import map', async ({ page }) => {
  execFileSync('python3', [path.join(root, 'scripts/build-static.py')], { cwd: root });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(root, 'dist/pretty-dice-offline.html'));
  await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__pd.GAMES.listGames().map(g => g.id))).toContain('yahtzee');
  expect(errors).toEqual([]);
});
