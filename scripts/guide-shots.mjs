// Regenerates every screenshot in docs/guide/img/ from the running app (`npm run guide`).
// Fixed seeds and fixed viewports, so images only change when the UI does. Software GL is fine.
// Usage: node scripts/guide-shots.mjs [name-filter ...]   e.g. node scripts/guide-shots.mjs bag roll
// The guide pages in docs/guide/*.md reference these file names; keep both in step.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../docs/guide/img/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = process.env.GUIDE_PORT || '8135';
const base = `http://127.0.0.1:${PORT}`;
const filters = process.argv.slice(2);
const DESK = { width: 1280, height: 800 }, PHONE = { width: 390, height: 844 };

let server = null;
if (!(await fetch(base + '/index.html').then(r => r.ok, () => false))) {
  server = spawn(process.execPath, [new URL('./serve.mjs', import.meta.url).pathname, PORT], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// Same mulberry32 the probe uses, so Math.random-driven looks and rolls repeat.
const seedScript = seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

async function open({ vp = DESK, query = '', seed = 7 } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: vp === PHONE });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.addInitScript(seedScript, seed);
  await page.goto(`${base}/index.html?libs=local&seed=${seed}${query ? '&' + query : ''}`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 90_000 });
  // The PD-141 lag toast would show up in shots under software GL; hide it. Hide the clock-driven log timestamps' noise too.
  await page.addStyleTag({ content: '#lagtoast{display:none!important}' });
  await page.waitForTimeout(1200);
  return { page, close: () => ctx.close() };
}
const settle = page => page.waitForFunction(() => window.__pd.rolling && window.__pd.settled, null, { timeout: 120_000 }).then(() => page.waitForTimeout(600));
const rollNow = async page => { await page.click('#mode'); await settle(page); };
const panelAt = async (page, heading) => {   // scroll the side panel so a section heading is at the top
  await page.locator('#panes h2', { hasText: new RegExp('^' + heading + '$', 'i') }).first().evaluate(e => e.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
};
const side = { x: 0, y: 0, width: 310, height: DESK.height };

// name, options, steps(page) -> optional clip rect
const SHOTS = [
  ['01-first-view', {}, async () => undefined],
  ['02-panel-shape', { query: 'shape=d8' }, async p => { await p.waitForTimeout(500); return side; }],
  ['03-substrates', { query: 'sub=metal' }, async p => { await panelAt(p, 'Substrate'); return side; }],
  ['04-colors', {}, async p => { await panelAt(p, 'Colors'); return side; }],
  ['05-numbers', {}, async p => { await panelAt(p, 'Numbers'); return side; }],
  ['06-relief-filigree', {}, async p => { await panelAt(p, 'Relief & patina'); return side; }],
  ['07-add-menu', {}, async p => { await p.click('#cards >> text=Add'); await p.waitForTimeout(500); }],
  ['08-bag-designs', {}, async p => { await p.click('#bagopen'); await p.waitForTimeout(700); }],
  ['09-bag-sets', { query: 'shape=custom' }, async p => { await p.fill('#notation', '2d6+3'); await p.click('#notapply'); await p.waitForTimeout(800); await p.fill('#setname', 'Thorn axe'); await p.click('button:text-is("Save as set")'); await p.waitForTimeout(600); await p.click('#bagopen'); await p.click('#sheettabs >> text=Sets'); await p.waitForTimeout(600); }],
  ['10-custom-set', { query: 'shape=custom' }, async p => { await p.fill('#notation', '2d6+d20+3'); await p.click('#notapply'); await p.waitForTimeout(1200); await panelAt(p, 'Custom set'); return side; }],
  ['11-roll-settled', {}, async p => { await rollNow(p); }],
  ['12-roll-log', {}, async p => { await rollNow(p); await p.click('#logbtn'); await p.waitForTimeout(400); }],
  ['13-roll-controls', {}, async p => { await p.click('#mode'); await p.waitForTimeout(500); await panelAt(p, 'Roll feel & sound'); return side; }],
  ['14-save-export', {}, async p => { await panelAt(p, 'Save & export'); return side; }],
  ['15-phone-showcase', { vp: PHONE }, async () => undefined],
  ['16-phone-roll', { vp: PHONE }, async p => { await rollNow(p); }],
  ['18-games-setup', {}, async p => { await p.click('#gamesbtn'); await p.waitForTimeout(800); }],
  ['19-yahtzee-hold', { seed: 7 }, async p => {   // seed 7 + software GL lands the same dice every run; tap two settled dice
    await p.click('#gamesbtn'); await p.click('text=Start game'); await p.waitForTimeout(1500);
    await p.click('#gamepanel button:has-text("Roll")'); await settle(p); await p.waitForTimeout(1000);
    await p.mouse.click(865, 570); await p.waitForTimeout(900); await p.mouse.click(660, 310); await p.waitForTimeout(1200); }],
  ['20-phone-game', { vp: PHONE }, async p => { await p.click('#gamesbtn'); await p.waitForTimeout(600); await p.click('text=Start game'); await p.waitForTimeout(1500); }],
  ['17-phone-bag', { vp: PHONE }, async p => { await p.click('#bagopen'); await p.waitForTimeout(700); }],
];

let n = 0;
for (const [name, opt, steps] of SHOTS) {
  if (filters.length && !filters.some(f => name.includes(f))) continue;
  const { page, close } = await open(opt);
  try {
    const clip = await steps(page);
    await page.screenshot({ path: `${OUT}${name}.png`, ...(clip ? { clip } : {}) });
    n++; console.log('shot', name);
  } catch (e) { console.error('FAILED', name, e.message.split('\n')[0]); process.exitCode = 1; }
  await close();
}
await browser.close(); server?.kill();
console.log(`${n} screenshots in docs/guide/img/`);
