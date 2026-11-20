// PD-156 / PD-165: deliberate score entry (double tap / long press; single tap previews) and the 3-second Whoopsie undo (Yacht).
import { test, expect } from './helpers/app.mjs';

const st = app => app.run(pd => pd.GAMES.status(pd.game.state));
async function start(app, seed) {
  await app.reset(seed);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
  await app.nav.roll();   // Start game
  if (await app.page.locator('#scorepane td').count() === 0) await app.page.click('text=Scorecard');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await expect(app.page.locator('#scorepane td.pick').first()).toBeVisible();
}
// a touch tap: the click event of a finger carries pointerType 'touch' (a mouse click scores at once, PD-165)
const touchTap = (app, sel) => app.page.evaluate(sel => { const el = document.querySelector(sel); el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })); el.dispatchEvent(new PointerEvent('click', { pointerType: 'touch', bubbles: true })); }, sel);
// Timing-sensitive touch sequences run INSIDE one page.evaluate: the gaps are in-page waits, so Playwright round-trip latency (huge under suite load) cannot stretch the 700 ms double-tap window or the long-press timer.
// steps: ['tap', sel] | ['down', sel] | ['up', sel] (up also fires the click) | ['mouse', sel] (a real mouse press+click) | ['wait', ms]
//   | ['rec'] (snapshot round/rollsUsed/previewed boxes) | ['whoop'] (click the Whoopsie button; throws if it is not there).
// Returns the 'rec' snapshots. The Whoopsie window is 3 s of real time: a Playwright round trip under load can outlast it, so a score
// and its undo must happen in the same page task (a separate click on [data-whoop] then waited out the 90 s test timeout for a button that had gone).
const touchSeq = (app, steps) => app.page.evaluate(async steps => {
  const recs = [];
  const P = (el, type) => el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true }));
  for (const [op, a] of steps) {
    if (op === 'wait') { await new Promise(r => setTimeout(r, a)); continue; }
    if (op === 'rec') { const pd = window.__pd, g = pd.GAMES.status(pd.game.state); recs.push({ round: g.round, rollsUsed: g.rollsUsed, prev: document.querySelectorAll('#scorepane td.prev').length }); continue; }
    if (op === 'whoop') { const w = document.querySelector('#scorepane [data-whoop]'); if (!w) throw new Error('touchSeq: no Whoopsie button'); w.click(); continue; }
    const el = document.querySelector(a); if (!el) { if (op === 'up') continue; throw new Error('touchSeq: no element for ' + a); }   // (a long press has already scored by its pointerup: the box is gone)
    if (op === 'tap') { P(el, 'pointerdown'); P(el, 'click'); }
    else if (op === 'down') P(el, 'pointerdown');
    else if (op === 'up') { P(el, 'pointerup'); P(el, 'click'); }
    else if (op === 'mouse') { for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(t, { pointerType: 'mouse', bubbles: true })); el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); }
  }
  return recs;
}, steps);
const total = app => app.page.locator('#scorepane tr.tot td').nth(1).textContent();

test('desktop mouse: a single click scores; touch: a single tap only previews, a double tap scores', async ({ shared: app }) => {
  await start(app, 51);
  await app.run(pd => { pd.gprefs.scoreMode = 'double'; pd.renderGame(); });   // PD-179: the unset default on touch is long press
  const a = await st(app), t0 = await total(app), sel = '#scorepane td.pick.best, #scorepane td.pick';
  await touchTap(app, sel);
  await expect(app.page.locator('#scorepane td.prev')).toHaveCount(1);
  let b = await st(app); expect(b.rollsUsed).toBe(a.rollsUsed); expect(await total(app)).toBe(t0);
  expect(await app.page.locator('#dockhint').textContent()).toContain('to score it');
  await touchSeq(app, [['wait', 800], ['tap', '#scorepane td.prev']]);   // a slow second tap is only another preview
  b = await st(app); expect(b.rollsUsed).toBe(a.rollsUsed);
  // the second tap inside 700 ms scores; the Whoopsie is used in the same page task (its 3 s window is real time)
  let r = await touchSeq(app, [['tap', '#scorepane td.prev'], ['rec'], ['whoop'], ['rec']]);
  expect(r[0].rollsUsed).toBe(0); expect(r[0].round).toBe(a.round + 1);
  expect(r[1].round).toBe(a.round);   // Whoopsie undid it
  // a plain mouse click scores at once, no preview, and shows the Whoopsie
  r = await touchSeq(app, [['mouse', sel], ['rec'], ['whoop']]);
  expect(r[0].round).toBe(a.round + 1); expect(r[0].prev).toBe(0);
});

test('whoopsie inside 3 s restores dice, rolls left and turn', async ({ shared: app }) => {
  await start(app, 52);
  const a = await st(app);
  // score, watch the countdown, check the saved game and undo in ONE page task: the 3 s window is real time and a test round trip can outlast it
  const o = await app.page.evaluate(async () => {
    const td = document.querySelector('#scorepane td.pick.best, #scorepane td.pick');   // a mouse press: lastPtr may still be 'touch' from an earlier test
    for (const t of ['pointerdown', 'pointerup']) td.dispatchEvent(new PointerEvent(t, { pointerType: 'mouse', bubbles: true }));
    td.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    const w = () => document.querySelector('#scorepane [data-whoop]'), t1 = w().textContent;
    await new Promise(r => setTimeout(r, 500));
    const t2 = w().textContent, pd = window.__pd, saved = JSON.parse(localStorage.getItem('prettydice.games.game')).state;
    const savedIsPrev = JSON.stringify(saved) === JSON.stringify(pd.game.state);
    w().click(); return { t1, t2, savedIsPrev };
  });
  expect(o.t1).toMatch(/Whoopsie.*\(\d\.\ds\)/);
  expect(o.t2).not.toBe(o.t1);   // the countdown moves
  expect(o.savedIsPrev).toBe(false);   // a pending score is not what a reload would see: the saved game is still the state before it
  const b = await st(app);
  expect(b.rollsUsed).toBe(a.rollsUsed); expect(b.dice).toEqual(a.dice); expect(b.round).toBe(a.round); expect(b.player).toBe(a.player);
  await expect(app.page.locator('[data-whoop]')).toHaveCount(0);
  await expect(app.page.locator('#scorepane td.pick').first()).toBeVisible();   // the box is open again
  await app.page.click('#scorepane td.pick.best, #scorepane td.pick');        // and can be scored again
  expect((await st(app)).round).toBe(a.round + 1);
});

test('after 3 s the score is locked in', async ({ shared: app }) => {
  await start(app, 53);
  const a = await st(app);
  // the window is measured in the page (score time to now), so a slow test round trip cannot make it look longer or shorter
  const o = await app.page.evaluate(async () => {
    const td = document.querySelector('#scorepane td.pick.best, #scorepane td.pick'), t0 = Date.now(), open = () => !!document.querySelector('[data-whoop]');
    for (const t of ['pointerdown', 'pointerup']) td.dispatchEvent(new PointerEvent(t, { pointerType: 'mouse', bubbles: true }));
    td.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    const first = open(); await new Promise(r => setTimeout(r, 2400)); const at2 = Date.now() - t0, still = open();
    while (open() && Date.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
    return { first, still, at2, gone: !open(), end: Date.now() - t0 };
  });
  expect(o.first).toBe(true);
  expect(o.at2 < 3000 ? o.still : true, 'still open before 3 s').toBe(true);
  expect(o.gone).toBe(true); expect(o.end).toBeGreaterThanOrEqual(2900);
  const b = await st(app); expect(b.round).toBe(a.round + 1);
  const saved = await app.run(() => JSON.parse(localStorage.getItem('prettydice.games.game')).state);
  expect(JSON.stringify(saved)).toBe(await app.run(pd => JSON.stringify(pd.game.state)));   // now the score is what a reload restores
});

test('long press scores; single-tap mode scores at once', async ({ shared: app }) => {
  await start(app, 54);
  const a = await st(app);
  await app.run(pd => { pd.gprefs.scoreMode = 'long'; pd.renderGame(); });   // the menu is touch-only (PD-172): set the pref directly
  const pick = '#scorepane td.pick.best, #scorepane td.pick';
  await touchSeq(app, [['down', pick], ['wait', 150], ['up', pick]]);   // a short touch press only previews
  expect((await st(app)).round).toBe(a.round);
  let r = await touchSeq(app, [['down', pick], ['wait', 700], ['up', pick], ['rec'], ['whoop']]);   // held past the long-press timer; then take it back
  expect(r[0].round).toBe(a.round + 1);
  expect((await st(app)).round).toBe(a.round);
  await app.run(pd => { pd.gprefs.scoreMode = 'single'; pd.renderGame(); });   // the menu is touch-only (PD-172): set the pref directly
  r = await touchSeq(app, [['tap', pick], ['rec']]);
  expect(r[0].round).toBe(a.round + 1);
  await app.run(pd => { pd.gprefs.scoreMode = 'double'; pd.renderGame(); });   // the menu is touch-only (PD-172): set the pref directly   // leave the shared page on the default
});

test('a bot turn waits out the window and a bot score has no whoopsie', async ({ shared: app }) => {
  await app.reset(55);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
  await app.run(pd => pd.startGame('yahtzee', ['Me', 'Bot'], {}, [1]));
  if (await app.page.locator('#scorepane td').count() === 0) await app.page.click('text=Scorecard');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await expect(app.page.locator('#scorepane td.pick').first()).toBeVisible();
  await app.page.click('#scorepane td.pick.best, #scorepane td.pick');
  expect((await st(app)).player).toBe(1);
  await app.page.waitForTimeout(1200);   // BOT_MS is 900 by default: the bot has not moved inside the window
  expect(await app.run(pd => pd.settled)).toBe(true);   // the bot has not started its roll
  expect((await st(app)).rollsUsed).toBe(0);
  await expect(app.page.locator('[data-whoop]')).toHaveCount(0, { timeout: 4000 });
  await expect.poll(() => app.run(pd => !pd.settled), { timeout: 8000 }).toBe(true);   // then the bot starts its roll
  await app.run(pd => pd.endGame());
});

// PD-172: the Score entry menu is for touch screens only; a mouse click scores directly.
import { navFor } from './helpers/nav.mjs';
import { test as ptest, expect as pexpect } from '@playwright/test';
for (const touch of [false, true]) {
  ptest(`Yacht Score entry menu is ${touch ? 'shown on a touch device' : 'hidden with a mouse'} (PD-172)`, async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 1100, height: 760 }, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await page.goto('/index.html?libs=local&seed=5');
    await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
    await page.evaluate(() => window.__pd.openGames());
    await page.selectOption('#scorepane select >> nth=0', 'yahtzee');
    await navFor(page).roll();   // Start game
    if (await page.locator('#scorepane td').count() === 0) await page.click('text=Scorecard');
    pexpect(await page.locator('#scorepane select[aria-label="Score entry"]').count()).toBe(touch ? 1 : 0);
    await ctx.close();
  });
}

// PD-179: on touch the default is long press; a single tap (even one whose click claims to be a mouse click, as on some phones) only previews
test('PD-179: unset score entry = long press on touch; mouse click scores; explicit double is honoured', async ({ shared: app }) => {
  await start(app, 57);
  await app.run(pd => { delete pd.gprefs.scoreMode; pd.renderGame(); });
  const sel = '#scorepane td.pick.best, #scorepane td.pick', a = await st(app);
  const fire = (type, init) => app.page.evaluate(([sel, type, init]) => { const el = document.querySelector(sel); if (el) el.dispatchEvent(new PointerEvent(type, { bubbles: true, ...init })); }, [sel, type, init]);
  const click = init => app.page.evaluate(([sel, init]) => { const el = document.querySelector(sel); el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, ...init })); }, [sel, init]);
  // finger tap whose click reports pointerType 'mouse' (and a double of them): previews only
  await fire('pointerdown', { pointerType: 'touch' }); await fire('pointerup', { pointerType: 'touch' }); await click({});
  expect((await st(app)).round).toBe(a.round);
  await click({});   // emulated clicks without a pointerdown after a touch: still no score
  expect((await st(app)).round).toBe(a.round);
  // long press scores
  let r = await touchSeq(app, [['down', sel], ['wait', 700], ['rec'], ['whoop']]);   // the long-press timer scored it (no pointerup needed); take it back at once (3 s real-time window)
  expect(r[0].round).toBe(a.round + 1);
  // a real mouse pointer clicks and scores at once
  r = await touchSeq(app, [['mouse', sel], ['rec'], ['whoop']]);
  expect(r[0].round).toBe(a.round + 1);
  // an explicit stored 'double' still works as a double tap
  await app.run(pd => { pd.gprefs.scoreMode = 'double'; pd.renderGame(); });
  r = await touchSeq(app, [['tap', sel], ['rec'], ['tap', '#scorepane td.prev'], ['rec'], ['whoop']]);
  expect(r[0].round).toBe(a.round); expect(r[1].round).toBe(a.round + 1);
});
