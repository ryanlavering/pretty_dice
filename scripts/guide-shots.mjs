// Regenerates every screenshot in docs/guide/img/ from the running app (`npm run guide`).
// Fixed seeds and fixed viewports, so images only change when the UI does. Software GL is fine.
// Usage: node scripts/guide-shots.mjs [name-filter ...]   e.g. node scripts/guide-shots.mjs bag roll
// The guide pages in docs/guide/*.md reference these file names; keep both in step.
import { chromium } from '@playwright/test';
import { navFor } from '../tests/helpers/nav.mjs';
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
const rollNow = async page => { const nav = navFor(page); await nav.toPlay(); await nav.roll(); await settle(page); };   // the Design | Play switch never throws: the dock's Roll does
const panelAt = async (page, heading) => {   // scroll the side panel so a section heading is at the top
  await page.locator('#panes h2', { hasText: new RegExp('^' + heading + '(\\b|$)', 'i') }).first().evaluate(e => e.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
};
// Screen position of die i (projected through the app's own camera), so a tap lands on the die whatever the physics did.
const dieAt = (page, i) => page.evaluate(i => { const pd = window.__pd; pd.renderOnce(); const d = pd.dice[i], r = pd.canvas.getBoundingClientRect(); const v = d.mesh.getWorldPosition(new d.mesh.position.constructor()).project(pd.camera); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }, i);
const holdDice = async (page, idx) => { for (const i of idx) { const { x, y } = await dieAt(page, i); await page.mouse.click(x, y); await page.waitForTimeout(900); } };
// Story Dice: start a game, roll, then tap the dice into the rings in order so the sentence and the grade buttons show.
const storyArranged = async p => {
  await storyStart(p, 1); await rollToTray(p); await p.waitForTimeout(3000);
  for (let i = 0; i < 5; i++) { await p.locator(`#storytray .stile[data-i="${i}"]`).click(); await p.waitForTimeout(500); }
  await p.waitForTimeout(1500); };
// Start a Story Dice game from the setup panel (a script click: the sticky Start button is never "stable" for Playwright's own click).
const storyStart = async (p, players) => {
  await navFor(p).openGames(); await p.selectOption('#scorepane select >> nth=0', 'story'); await p.waitForTimeout(3000);
  if (players > 1) { await p.selectOption('#scorepane select >> nth=1', String(players)); await p.waitForTimeout(800); await p.locator('#scorepane input[type=number]').nth(1).fill('2'); await p.waitForTimeout(1500); }
  await p.waitForTimeout(2000); await p.evaluate(() => document.querySelector('#scorepane button.big').click());
  await p.waitForFunction(() => document.body.classList.contains('game'), null, { timeout: 60_000 }); await p.waitForTimeout(1500); };
// Roll, arrange and rate one story (rating index 0..4 = Bad..Great).
const rollToTray = async p => {
  for (let tries = 0; tries < 4; tries++) {   // a Roll pressed too soon after the start or a rating can be ignored: wait for the button, press, and press again if no story tray shows up
    await p.waitForFunction(() => { const b = document.getElementById('rollbtn'); return b && !b.disabled; }, null, { timeout: 60_000 });
    await p.evaluate(() => document.getElementById('rollbtn').click()); await p.waitForTimeout(1000);
    if (await p.waitForSelector('#storytray .stile', { timeout: 100_000 }).then(() => true, () => false)) return;
  }
  throw new Error('the story tray never showed'); };
const storyTurn = async (p, rating) => {
  await rollToTray(p); await p.waitForTimeout(3000);
  for (let i = 0; i < 5; i++) { await p.locator(`#storytray .stile[data-i="${i}"]`).click(); await p.waitForTimeout(500); }
  await p.waitForTimeout(1200); await p.locator('#qbar button.rbtn').nth(rating).click(); await p.waitForTimeout(2000); };
const side = { x: 0, y: 0, width: 310, height: DESK.height };

// name, options, steps(page) -> optional clip rect
const SHOTS = [
  ['01-first-view', {}, async () => undefined],
  ['02-panel-shape', { query: 'shape=d8' }, async p => { await p.waitForTimeout(500); return side; }],
  ['03-substrates', { query: 'sub=metal' }, async p => { await panelAt(p, 'Substrate'); return side; }],
  ['04-colors', {}, async p => { await panelAt(p, 'Colors'); return side; }],
  ['05-numbers', {}, async p => { await panelAt(p, 'Numbers'); return side; }],
  ['06-relief-filigree', {}, async p => { await panelAt(p, 'Filigree'); return side; }],
  ['07-add-menu', {}, async p => { await p.click('#cards >> text=Add'); await p.waitForTimeout(500); }],
  ['08-bag-designs', {}, async p => { await navFor(p).openBag(); await p.waitForTimeout(700); }],
  ['09-bag-sets', { query: 'shape=custom' }, async p => { await p.fill('#notation', '2d6+3'); await p.click('#notapply'); await p.waitForTimeout(800); await p.fill('#setname', 'Thorn axe'); await p.click('button:text-is("Save as set")'); await p.waitForTimeout(600); await p.click('#bagbtn'); await p.click('#sheettabs [data-tab=sets]'); await p.waitForTimeout(600); }],
  ['10-custom-set', { query: 'shape=custom' }, async p => { await p.fill('#notation', '2d6+d20+3'); await p.click('#notapply'); await p.waitForTimeout(1200); await panelAt(p, 'Custom set'); return side; }],
  ['11-roll-settled', {}, async p => { await rollNow(p); }],
  ['12-roll-log', {}, async p => { await rollNow(p); await navFor(p).openLog(); await p.waitForTimeout(400); }],
  ['13-roll-controls', {}, async p => { await navFor(p).toPlay(); await p.waitForTimeout(500); await panelAt(p, 'Roll feel'); return side; }],
  ['14-save-export', {}, async p => { await panelAt(p, 'Save & export'); return side; }],
  ['15-phone-showcase', { vp: PHONE }, async () => undefined],
  ['16-phone-roll', { vp: PHONE }, async p => { await rollNow(p); }],
  ['18-games-setup', {}, async p => { await navFor(p).openGames(); await p.waitForTimeout(800); }],
  ['19-yahtzee-hold', { seed: 7 }, async p => {   // tap two settled dice by their projected screen position: gold rings
    await navFor(p).openGames(); await p.click('text=Start game'); await p.waitForTimeout(1500);
    await navFor(p).roll(); await settle(p); await p.waitForTimeout(1000);
    await holdDice(p, [0, 1]); await p.waitForTimeout(600); }],
  ['20-phone-game', { vp: PHONE }, async p => { await navFor(p).openGames(); await p.waitForTimeout(600); await p.click('text=Start game'); await p.waitForTimeout(3000); }],
  ['21-group-roll-initiative', {}, async p => {   // 4x d20+2 as four separate rolls, then add them to the initiative list
    await rollNow(p); await p.fill('#rollbox', '4x d20+2'); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); await settle(p);
    await navFor(p).openLog(); await p.waitForTimeout(500); await p.click('#logpanel button.ini >> nth=0'); await p.waitForTimeout(600); }],
  ['22-result-table-log', { query: 'shape=custom' }, async p => {   // a set with a result table, rolled with its lightning button
    await p.fill('#notation', 'd10'); await p.click('#notapply'); await p.waitForTimeout(600);
    await p.fill('#setname', 'Dungeon room'); await p.click('button:text-is("Save as set")'); await p.waitForTimeout(600);
    await p.click('#bagbtn'); await p.click('#sheettabs [data-tab=sets]'); await p.waitForTimeout(600);
    await p.click('button:text-is("✎")'); await p.waitForTimeout(900);
    await p.locator('textarea').first().fill('1-2 Locked door\n3 Empty room\n4-8 Goblins\n9+ Boss');
    await p.click('#setlist button.sesave2'); await p.waitForTimeout(800);
    await p.click('button:text-is("⚡")'); await p.waitForTimeout(2500);   // the set's quick roll records in the log
    await p.click('#sheetclose'); await p.waitForTimeout(600);
    await navFor(p).openLog(); await p.waitForTimeout(600); }],
  ['23-phone-design-pane', { vp: PHONE }, async p => { await panelAt(p, 'Substrate'); }],
  ['24-phone-add-menu', { vp: PHONE }, async p => { await p.click('#cards >> text=Add'); await p.waitForTimeout(500); }],
  ['25-phone-sets', { vp: PHONE, query: 'shape=custom' }, async p => { await p.fill('#notation', '2d6+3'); await p.click('#notapply'); await p.waitForTimeout(800); await p.fill('#setname', 'Thorn axe'); await p.click('button:text-is("Save as set")'); await p.waitForTimeout(600); await p.click('#bagbtn'); await p.click('#sheettabs [data-tab=sets]'); await p.waitForTimeout(600); }],
  ['26-phone-hold', { vp: PHONE }, async p => { await navFor(p).openGames(); await p.click('text=Start game'); await p.waitForTimeout(1500); await navFor(p).roll(); await settle(p); await p.waitForTimeout(800); await holdDice(p, [0, 1]); await p.waitForTimeout(600); }],
  ['27-phone-log', { vp: PHONE }, async p => { await rollNow(p); await navFor(p).openLog(); await p.waitForTimeout(400); }],
  ['28-phone-drawer', { vp: PHONE }, async p => { await navFor(p).openDrawer(); }],
  ['29-phone-scorecard', { vp: PHONE }, async p => { await navFor(p).openGames(); await p.click('text=Start game'); await p.waitForTimeout(1500); await navFor(p).roll(); await settle(p); await p.waitForTimeout(800); }],
  ['30-story-setup', {}, async p => { await navFor(p).openGames(); await p.selectOption('#scorepane select >> nth=0', 'story'); await p.waitForTimeout(3000); }],
  ['31-story-arrange', {}, async p => { await storyArranged(p); }],
  ['32-story-sets', {}, async p => { await navFor(p).openGames(); await p.selectOption('#scorepane select >> nth=0', 'story'); await p.waitForTimeout(3000); await p.waitForSelector('#storysets', { timeout: 60_000 }); await p.locator('#storysets').scrollIntoViewIfNeeded(); await p.evaluate(() => document.getElementById('storysets').click()); await p.waitForSelector('#ssnew', { timeout: 60_000 }); await p.evaluate(() => document.getElementById('ssnew').click()); await p.waitForTimeout(6000); return side; }],
  ['33-phone-story', { vp: PHONE }, async p => { await storyArranged(p); }],
  ['34-story-over', {}, async p => { await storyStart(p, 2); for (const r of [3, 4, 2, 4]) await storyTurn(p, r); await p.waitForSelector('#storyagain', { timeout: 60_000 }); await p.waitForTimeout(2500); }],   // two people, two stories each: the game over screen
  ['35-story-end-confirm', {}, async p => { await storyStart(p, 1); await navFor(p).roll(); await settle(p); await p.waitForTimeout(2500); await p.locator('#scorepane button:text-is("End game")').click(); await p.waitForSelector('.story-confirm'); await p.waitForTimeout(800); }],
  ['36-story-bag', {}, async p => { await storyStart(p, 1); await navFor(p).openBag(); await p.waitForTimeout(1500); }],
  ['17-phone-bag', { vp: PHONE }, async p => { await navFor(p).openBag(); await p.waitForTimeout(700); }],
];

let n = 0;
for (const [name, opt, steps] of SHOTS) {
  if (filters.length && !filters.some(f => name.includes(f))) continue;
  const { page, close } = await open(opt);
  try {
    const clip = await steps(page);
    await page.screenshot({ path: `${OUT}${name}.png`, timeout: 180_000, ...(clip ? { clip } : {}) });
    n++; console.log('shot', name);
  } catch (e) { console.error('FAILED', name, e.stack.split('\n').slice(0, 6).join(' | ')); process.exitCode = 1; }
  await close();
}
await browser.close(); server?.kill();
console.log(`${n} screenshots in docs/guide/img/`);
