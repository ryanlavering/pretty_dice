// node tools/gomboc-die/shots.mjs outDir  -- screenshots of the resting gomboc d1 (seed 1) and of the stalled ring (short cap, manual reroll)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const out = process.argv[2] || '.', base = 'http://127.0.0.1:8131';
const server = spawn(process.execPath, [new URL('../../scripts/serve.mjs', import.meta.url).pathname, '8131'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 3 });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`${base}/index.html?libs=local&seed=1&shape=gomboc172`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 120_000 });
  await page.evaluate(() => { const pd = window.__pd; pd.pause(); pd.reseed(1); const r = pd.simRoll({ maxSteps: 4000 }); pd.renderOnce(); return r.result; });
  await page.waitForTimeout(500);
  console.log('rest', await page.evaluate(() => { const pd = window.__pd; pd.renderOnce(); return { main: document.querySelector('#result .tot')?.textContent, faces: pd.faces, settled: pd.settled }; }));
  await page.screenshot({ path: `${out}/gomboc-rest.png` });
  { const c = await page.evaluate(() => window.__pd.bodyScreen(0)); await page.screenshot({ path: `${out}/gomboc-zoom.png`, clip: { x: c.x - 90, y: c.y - 90, width: 180, height: 180 } }); }
  // top-down peek of the apex "1"
  await page.evaluate(() => { const pd = window.__pd; pd.holdTop(true); pd.renderOnce(); }); await page.waitForTimeout(1200);
  await page.evaluate(() => window.__pd.renderOnce()); await page.screenshot({ path: `${out}/gomboc-top.png` }); await page.evaluate(() => window.__pd.holdTop(false));
  // stalled ring: manual reroll, short cap, find a seed that stalls
  const info = await page.evaluate(() => { const pd = window.__pd; pd.state.manualReroll = true; pd.gombocCapS = 5; for (let s = 101; s < 140; s++) { pd.reseed(s); pd.simRoll({ maxSteps: 4000 }); if (pd.rrStall) { pd.renderOnce(); return { seed: s, stalls: pd.gombocStalls, rrPending: pd.rrPending, chip: document.querySelector('#result .rrchip')?.textContent, rings: pd.rrRingCount }; } } return null; });
  console.log('stall', info); await page.waitForTimeout(500); await page.evaluate(() => window.__pd.renderOnce());
  await page.screenshot({ path: `${out}/gomboc-stall.png` });
  // manual reroll from the chip
  console.log('reroll', await page.evaluate(() => { const pd = window.__pd; pd.gombocCapS = 60; const b = document.querySelector('#result .rrchip'); b.click(); pd.step(4000); for (let g = 0; pd.rrPending && g < 3; g++) { pd.rerollNow(); pd.step(4000); } return { rrPending: pd.rrPending, settled: pd.settled, faces: pd.faces, main: document.querySelector('#result .tot')?.textContent }; }));
} finally { await browser.close(); server.kill(); }
