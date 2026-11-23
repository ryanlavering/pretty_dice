// node tools/gomboc-die/probe.mjs 'expr using pd' [query]   -- evaluate an expression in the gomboc page (own server on port 8131)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const base = 'http://127.0.0.1:8131', expr = process.argv[2], q = process.argv[3] || '';
const server = spawn(process.execPath, [new URL('../../scripts/serve.mjs', import.meta.url).pathname, '8131'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`${base}/index.html?libs=local&seed=1&shape=gomboc172&lite${q}`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 90_000 });
  console.log(JSON.stringify(await page.evaluate(async src => { const pd = window.__pd; return await (0, eval)(`(async pd => (${src}))`)(pd); }, expr), null, 1));
} finally { await browser.close(); server.kill(); }
