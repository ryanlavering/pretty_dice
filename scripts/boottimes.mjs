// Print the boot stage timings and any lag events the monitor saw. Usage: node scripts/boottimes.mjs [query]   (starts its own server)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const base = 'http://127.0.0.1:8126';
const server = spawn(process.execPath, [new URL('./serve.mjs', import.meta.url).pathname, '8126'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
// PD_GPU=1 uses the real GPU through WSL's D3D12 passthrough (Mesa d3d12 via ANGLE); default is software GL
const gpu = process.env.PD_GPU === '1';
const browser = await chromium.launch(gpu ? { args: ['--use-angle=gl-egl', '--ignore-gpu-blocklist'], env: { ...process.env, GALLIUM_DRIVER: 'd3d12' } } : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`${base}/index.html${process.argv[2] || '?libs=local&seed=3'}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
  console.log(JSON.stringify(await page.evaluate(() => ({ bootMs: window.__bootMs, stages: window.__bootStages.map(s => [s.label, s.ms]), lag: window.__lag.report().events })), null, 1));
} finally { await browser.close(); server.kill(); }
