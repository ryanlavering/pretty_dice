// node tools/gomboc-die/rooms.mjs [real] [artifact]  -- select the gomboc d1 from the picker in the Design room, the Play room, mid-roll, and after a reload with it saved
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const lite = !process.argv.includes('real'), art = process.argv.includes('artifact'), base = 'http://127.0.0.1:8131';
const server = spawn(process.execPath, [new URL('../../scripts/serve.mjs', import.meta.url).pathname, '8131'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'] });
const url = art ? `${base}/dist/pretty-dice-artifact.html` : `${base}/index.html?libs=local&seed=1&gomboc${lite ? '&lite' : ''}`;
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 120_000 });
  const snap = async label => console.log(label.padEnd(34), JSON.stringify(await page.evaluate(() => { const pd = window.__pd; return { shape: pd.state.shape, dice: pd.dice.length, rolling: pd.rolling, placed: pd.placed, designRoom: !document.querySelector('#back.on'), chip: document.querySelector('#result')?.textContent.slice(0, 60), meshes: pd.dice.map(d => d.mesh.visible) }; })));
  const pick = () => page.evaluate(() => document.querySelector('button[data-id=gomboc172]').click());
  await snap('boot');
  await pick(); await page.waitForTimeout(600); await snap('design: pick gomboc');
  await page.click('#roll'); await page.waitForTimeout(800); await snap('-> Play');
  await page.evaluate(() => window.__pd.dockRoll()); await page.waitForTimeout(1500); await snap('Play: roll');
  await page.evaluate(() => { const b = document.querySelector('button[data-id=d20]'); b.click(); }); await page.waitForTimeout(800); await snap('Play: pick d20');
  await pick(); await page.waitForTimeout(800); await snap('Play: pick gomboc (placed)');
  await page.evaluate(() => window.__pd.dockRoll()); await page.waitForTimeout(1500); await snap('Play: roll gomboc');
  await pick(); await page.waitForTimeout(800); await snap('Play: pick gomboc mid/after roll');
  await page.reload(); await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 120_000 }); await page.waitForTimeout(800); await snap('reload with gomboc saved');
  await page.click('#roll').catch(() => {}); await page.waitForTimeout(800); await snap('reload -> Play');
  console.log('errors:', JSON.stringify(errs.slice(0, 6)));
} finally { await browser.close(); server.kill(); }
