// The games engine must be importable as 'pd-games' in the dev page and in the single-file offline build (file://, no network).
import { test as plain, expect } from '@playwright/test';
import { test } from './helpers/app.mjs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const probe = async () => { const g = await import('pd-games'); const s = g.act(g.newGame('yahtzee', { players: ['A'] }), { type: 'roll', values: [1, 2, 3, 4, 5] }).state; return g.suggest(s).find(r => r.category === 'largeStraight').points; };

test('pd-games imports in the dev page', async ({ shared }) => {
  await shared.reset(1);
  expect(await shared.page.evaluate(`(${probe})()`)).toBe(40);
});

plain('pd-games imports in the offline build', async ({ page }) => {
  execFileSync('python3', [path.join(root, 'scripts/build-static.py')], { cwd: root });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root, 'dist/pretty-dice-offline.html')).href);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
  expect(await page.evaluate(`(${probe})()`)).toBe(40);
  expect(errors).toEqual([]);
});
