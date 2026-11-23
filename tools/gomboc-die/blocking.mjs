// node tools/gomboc-die/blocking.mjs [shape=gomboc172] [nolite]  -- longtask observer over load, a shape select and rolls (real render loop, no ?lite)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const shape = process.argv[2] || 'gomboc172', base = 'http://127.0.0.1:8131';
const server = spawn(process.execPath, [new URL('../../scripts/serve.mjs', import.meta.url).pathname, '8131'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.addInitScript(() => { window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); });
  const t0 = Date.now();
  await page.goto(`${base}/index.html?libs=local&seed=1&shape=${shape}&gomboc`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 180_000 });
  console.log('ready after', Date.now() - t0, 'ms; longtasks', JSON.stringify(await page.evaluate(() => window.__lt)));
  if (shape !== 'gomboc172') { const t1 = Date.now(); await page.evaluate(() => { document.querySelector('#shapes [data-id=gomboc172], button[data-id=gomboc172]').click(); }); await page.waitForTimeout(3000); console.log('select ->', await page.evaluate(() => window.__pd.state.shape), Date.now() - t1, 'ms; longtasks', JSON.stringify(await page.evaluate(() => window.__lt))); }
  const r = await page.evaluate(async () => {
    const pd = window.__pd, out = {}; const bs = pd.bodies;
    const t = performance.now(); pd.startRoll(); out.startRollMs = Math.round(performance.now() - t);
    for (let i = 0; i < 40; i++) await new Promise(r => setTimeout(r, 250));
    out.settled = pd.settled; out.rollT = +pd.rollT.toFixed(1); out.faces = pd.faces; return out; });
  console.log('roll', JSON.stringify(r), 'longtasks', JSON.stringify(await page.evaluate(() => window.__lt)));
  const m = await page.evaluate(() => { const pd = window.__pd, w = pd.bodies[0]; const t = performance.now(); for (let i = 0; i < 60; i++) pd.step(1); return (performance.now() - t) / 60; });
  console.log('ms per simStep (settled? steps may no-op):', m.toFixed(3));
} finally { await browser.close(); server.kill(); }
