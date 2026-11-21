// PD-187 rework: the owner's real flows in the single-file artifact build (the page a reviewer opens), through the UI, with a realistic saved bag.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { navFor } from './helpers/nav.mjs';

const root = path.resolve(import.meta.dirname, '..');
const CSP = "script-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com";
const vendorFor = url => { const p = new URL(url).pathname; let m;
  if ((m = p.match(/^\/npm\/three@[\d.]+\/(build|examples\/jsm)\/(.+)$/))) return path.join(root, 'vendor/three', m[1], m[2]);
  if ((m = p.match(/^\/npm\/cannon-es@[\d.]+\/(.+)$/))) return path.join(root, 'vendor/cannon-es', m[1]);
  return null; };
const ready = page => page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
const LITE = process.env.PD_NOLITE ? '' : '?lite';   // same render profile as the other specs (no shadows/AA, no per-frame draw)
let t0 = Date.now(); const lap = l => { if (process.env.PD_PROFILE) console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${l}`); };
// what the player owns: every persisted key except the roll log (and the roller name a boot adds) (a played round legitimately adds to those)
// PD-190: while a game runs, the settings store holds the game's look and the bag store carries the hold (with the game draft) and active.draft 'game': what the player owns is the designs, pending edits, sets and random draft.
const stored = page => page.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) if (/^prettydice\.(v1|bag\.v1)$/.test(k)) o[k] = localStorage.getItem(k); const b = JSON.parse(o['prettydice.bag.v1']); delete b.log; delete b.roller; delete b.hold; if (b.active.draft === 'game') b.active.draft = false; o['prettydice.bag.v1'] = JSON.stringify(b); return o; });
const owned = page => page.evaluate(() => { const b = JSON.parse(localStorage.getItem('prettydice.bag.v1')); return JSON.stringify({ d: b.designs, p: b.pending, s: b.sets, r: b.draft }); });
const live = page => page.evaluate(() => { const pd = window.__pd; return { sub: pd.state.substrate, cols: [...pd.state.palettes.shared], active: JSON.stringify(pd.bag.active), pending: Object.keys(pd.bag.pending).join() }; });

test('PD-187 (artifact, UI): Story Dice round, mid-game pick, Randomize, reload: the player\'s designs are never overwritten', async ({ page }) => {
  test.setTimeout(240_000);
  execFileSync('python3', [path.join(root, 'scripts/build-static.py'), '--artifact'], { cwd: root });
  const html = fs.readFileSync(path.join(root, 'dist/pretty-dice-artifact.html'), 'utf8');
  await page.route(/^https:\/\/artifact\.test\//, r => r.fulfill({ status: 200, contentType: 'text/html', headers: { 'Content-Security-Policy': CSP }, body: html }));
  await page.route('https://cdn.jsdelivr.net/**', r => { const f = vendorFor(r.request().url()); if (!f || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) }); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.setViewportSize({ width: 1280, height: 800 });
  const nav = navFor(page);
  await page.addInitScript(() => { if (!localStorage.getItem('prettydice.v1')) localStorage.setItem('prettydice.v1', JSON.stringify({ filigree: 'none' })); });   // plain boot look: the random one may carry filigree (3-6 s of canvas work per dice build)
  await page.goto('https://artifact.test/' + LITE); await ready(page);

  // a saved bag of three colourful designs, "Swirly" active
  await page.evaluate(async () => { const pd = window.__pd; for (const [n, s, c] of [['Swirly', 'swirl', ['#aa2233', '#33aa44', '#2233aa']], ['Metal', 'metal', ['#b08d57', '#888888', '#444444']], ['Pips', 'solid', ['#112233', '#445566', '#778899']]]) { const j = pd.designToJSON(); j.filigree = { ...j.filigree, style: 'none' }; j.substrate = s; j.colors = c; j.name = n; await pd.bagOps.addLoaded(JSON.parse(JSON.stringify(j))); } await pd.bagActivate('swirly'); });
  await page.waitForTimeout(1200);
  lap('bag built');
  const before = await stored(page), look0 = await live(page);
  expect(look0.sub).toBe('swirl'); expect(look0.pending).toBe('');

  // Story Dice from the Games tab: setup preview, start, roll
  await nav.openGames(); await page.selectOption('#scorepane select >> nth=0', 'story'); await page.waitForTimeout(800);
  const own0 = await owned(page);
  expect(await owned(page)).toBe(own0);                           // the setup preview changes none of the player's designs, edits, sets or draft
  await nav.roll(); await page.waitForTimeout(1500);
  expect((await live(page)).sub).toBe('solid');                   // the game's plain look is live (the game draft)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prettydice.bag.v1')).active.draft)).toBe('game');
  expect(await owned(page)).toBe(own0);                           // ...and none of it is written into the player's designs
  await page.evaluate(() => window.__pd.simRoll({ rerolls: 6 }));
  expect(await owned(page)).toBe(own0);

  lap('round1 done');
  // reload mid-game: the player's saved look comes back, not the game's
  await page.reload(); await ready(page);
  expect(await stored(page)).toEqual(before);
  expect(await live(page)).toEqual(look0);

  lap('reload1 done');
  // second round, end it: exactly the pre-game state, the design is not Modified, and re-selecting it from the Bag keeps its look
  await nav.openGames(); await page.selectOption('#scorepane select >> nth=0', 'story'); await page.waitForTimeout(800); await nav.roll(); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__pd.simRoll({ rerolls: 6 })); await page.evaluate(() => window.__pd.endGame()); await page.waitForTimeout(800);
  expect(await stored(page)).toEqual(before);
  expect(await live(page)).toEqual(look0);
  await page.reload(); await ready(page);
  expect(await stored(page)).toEqual(before); expect(await live(page)).toEqual(look0);
  await nav.openBag(); await page.locator('#bagsheet .tile', { hasText: 'Metal' }).click(); await page.waitForTimeout(1200);
  await nav.openBag(); await page.locator('#bagsheet .tile', { hasText: 'Swirly' }).click(); await page.waitForTimeout(1200);
  const back = await live(page); expect(back.sub).toBe('swirl'); expect(back.cols).toEqual(look0.cols); expect(back.pending).toBe('');

  lap('round2+reload2+pick-back done');
  // mid-game Bag pick (Story, a d6-saved design in a 5d12 game) is accepted as a look and survives the game
  await nav.openGames(); await page.selectOption('#scorepane select >> nth=0', 'story'); await page.waitForTimeout(800); await nav.roll(); await page.waitForTimeout(1500);
  const dice = await page.evaluate(() => window.__pd.dice.length);
  await nav.openBag(); await page.locator('#bagsheet .tile', { hasText: 'Pips' }).click(); await page.waitForTimeout(1500);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prettydice.bag.v1')).active.design)).toBe('pips');
  expect((await live(page)).sub).toBe('solid'); expect((await live(page)).cols).toEqual(['#112233', '#445566', '#778899']);   // Pips' own colours, not the game's white
  expect(await page.evaluate(() => window.__pd.dice.length)).toBe(dice);
  expect(await page.evaluate(() => document.body.innerText)).not.toContain('fixes the dice');
  // Randomize mid-game: the active design (Pips) must not gain the game's/any look as an edit; the draft is the player's
  lap('pick done');
  const pipsBefore = await page.evaluate(() => JSON.stringify(window.__pd.bag.designs.find(d => d.id === 'pips').design));
  await page.evaluate(() => window.__pd.randomize()); await page.waitForTimeout(600);
  await page.evaluate(() => window.__pd.endGame()); await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({ pending: Object.keys(window.__pd.bag.pending).join(), pips: JSON.stringify(window.__pd.bag.designs.find(d => d.id === 'pips').design), swirly: JSON.stringify(window.__pd.bag.designs.find(d => d.id === 'swirly').design), draft: window.__pd.bag.active.draft }));
  expect(after.pending).toBe(''); expect(after.pips).toBe(pipsBefore); expect(after.draft).toBe(true);
  expect(JSON.parse(before['prettydice.bag.v1']).designs.find(d => d.id === 'swirly').design).toEqual(JSON.parse(after.swirly));
  lap('end');
});
