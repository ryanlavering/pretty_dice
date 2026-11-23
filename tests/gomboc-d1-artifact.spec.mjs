// Regression (owner, build 1642274): the artifact build bundles src/ modules and only sees the first name of `export const a=..., b=...`, so GOMBOC_APEX was
// undefined there ("apex is not iterable") and selecting the gomboc d1 left the app with no die. Dev servers never showed it.
import { test, expect } from './helpers/app.mjs';
import { test as plain } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

plain('the gomboc d1 builds in the bundled artifact build (picker, roll)', async ({ page }) => {
  execFileSync('python3', [path.join(root, 'scripts/build-static.py'), '--artifact'], { cwd: root });
  const html = fs.readFileSync(path.join(root, 'dist/pretty-dice-artifact.html'), 'utf8');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://artifact.test/', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.route('https://cdn.jsdelivr.net/**', r => {
    const p = new URL(r.request().url()).pathname; let m, file = null;
    if ((m = p.match(/^\/npm\/three@[\d.]+\/(build|examples\/jsm)\/(.+)$/))) file = path.join(root, 'vendor/three', m[1], m[2]);
    else if ((m = p.match(/^\/npm\/cannon-es@[\d.]+\/(.+)$/))) file = path.join(root, 'vendor/cannon-es', m[1]);
    if (!file || !fs.existsSync(file)) return r.fulfill({ status: 404, body: 'not vendored' });
    r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(file) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('https://artifact.test/');
  await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 90_000 });
  await page.evaluate(() => document.querySelector('button[data-id=gomboc172]').click());   // the review build lists it in the shape picker
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const pd = window.__pd; pd.reseed(101); const x = pd.simRoll({ maxSteps: 4000 }); return { shape: pd.state.shape, dice: pd.dice.length, settled: x.settled, label: x.dice[0].label }; });
  expect(r).toEqual({ shape: 'gomboc172', dice: 1, settled: true, label: 1 });
  expect(errors).toEqual([]);
});

test('a gomboc d1 build failure falls back to the previous shape with a visible message instead of leaving no die', async ({ app, page }) => {
  await app.open({ query: 'shape=d12&gomboc' });
  const r = await page.evaluate(() => {
    const pd = window.__pd; pd.SHAPES.gomboc172.verts = () => { throw new Error('boom'); };
    pd.state.shape = 'gomboc172'; pd.buildDice();
    return { shape: pd.state.shape, dice: pd.dice.length, toast: document.getElementById('toast')?.textContent };
  });
  expect(r.shape).toBe('d12'); expect(r.dice).toBe(1); expect(r.toast).toContain('Gomboc d1 failed to build: boom');
});
