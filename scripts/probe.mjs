// Ad-hoc check: boot the app headless and print the result of a JS expression evaluated with `pd` = window.__pd.
// Usage: node scripts/probe.mjs 'pd.simRoll()' [--query 'shape=d20'] [--seed 7]   (seed goes in ?seed=)
// Needs the test server: it starts one on 8124 unless one is already running.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const query = opt('--query') || '', seed = +(opt('--seed') || 1), expr = args.join(' ') || 'pd.state';
const base = 'http://127.0.0.1:8124';
let server = null;
if (!(await fetch(base + '/index.html').then(r => r.ok, () => false))) {
  server = spawn(process.execPath, [new URL('./serve.mjs', import.meta.url).pathname, '8124'], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas']   // same flags as playwright.config.mjs });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', m => console.error(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => console.error(`[pageerror] ${e.message}`));
  await page.addInitScript(seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  await page.goto(`${base}/index.html?libs=local&seed=${seed}${query ? '&' + query : ''}`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 60_000 });
  const out = await page.evaluate(async src => { const pd = window.__pd; const v = await (0, eval)(`(async pd => (${src}))`)(pd); return JSON.parse(JSON.stringify(v ?? null)); }, expr);
  console.log(JSON.stringify(out, null, 2));
} finally { await browser.close(); server?.kill(); }
