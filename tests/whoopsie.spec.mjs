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
// steps: ['tap', sel] | ['down', sel] | ['up', sel] (up also fires the click) | ['wait', ms]; returns nothing.
const touchSeq = (app, steps) => app.page.evaluate(async steps => {
  const P = (el, type) => el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true }));
  for (const [op, a] of steps) {
    if (op === 'wait') { await new Promise(r => setTimeout(r, a)); continue; }
    const el = document.querySelector(a); if (!el) throw new Error('touchSeq: no element for ' + a);
    if (op === 'tap') { P(el, 'pointerdown'); P(el, 'click'); }
    else if (op === 'down') P(el, 'pointerdown');
    else if (op === 'up') { P(el, 'pointerup'); P(el, 'click'); }
  }
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
  await touchSeq(app, [['tap', '#scorepane td.prev']]);   // the second tap inside 700 ms scores
  b = await st(app); expect(b.rollsUsed).toBe(0); expect(b.round).toBe(a.round + 1);
  await expect(app.page.locator('[data-whoop]').first()).toBeVisible();
  await app.page.click('#scorepane [data-whoop]');
  b = await st(app); expect(b.round).toBe(a.round);
  await app.page.click(sel);   // a plain mouse click scores at once, no preview
  b = await st(app); expect(b.round).toBe(a.round + 1);
  await expect(app.page.locator('#scorepane td.prev')).toHaveCount(0);
  await expect(app.page.locator('[data-whoop]').first()).toBeVisible();
});

test('whoopsie inside 3 s restores dice, rolls left and turn', async ({ shared: app }) => {
  await start(app, 52);
  const a = await st(app);
  await app.page.click('#scorepane td.pick.best, #scorepane td.pick');
  const w = app.page.locator('#scorepane [data-whoop]');
  await expect(w).toHaveText(/Whoopsie.*\(\d\.\ds\)/);
  const t1 = await w.textContent(); await app.page.waitForTimeout(500);
  expect(await w.textContent()).not.toBe(t1);   // the countdown moves
  // a pending score is not what a reload would see: the saved game is still the state before it
  const saved = await app.run(() => JSON.parse(localStorage.getItem('prettydice.games.game')).state);
  expect(JSON.stringify(saved)).not.toBe(await app.run(pd => JSON.stringify(pd.game.state)));
  await w.click();
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
  await app.page.click('#scorepane td.pick.best, #scorepane td.pick');
  await expect(app.page.locator('[data-whoop]').first()).toBeVisible();
  await app.page.waitForTimeout(2400); await expect(app.page.locator('[data-whoop]')).not.toHaveCount(0);   // still open after 2 s
  await expect(app.page.locator('[data-whoop]')).toHaveCount(0, { timeout: 2500 });
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
  await touchSeq(app, [['down', pick], ['wait', 700], ['up', pick]]);   // held past the long-press timer
  expect((await st(app)).round).toBe(a.round + 1);
  await app.page.click('#scorepane [data-whoop]');   // take it back, then try single-tap mode
  await app.run(pd => { pd.gprefs.scoreMode = 'single'; pd.renderGame(); });   // the menu is touch-only (PD-172): set the pref directly
  await touchTap(app, '#scorepane td.pick.best, #scorepane td.pick');
  expect((await st(app)).round).toBe(a.round + 1);
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
  await touchSeq(app, [['down', sel], ['wait', 700]]); await fire('pointerup', { pointerType: 'touch' });   // (the click that follows a long press is swallowed by lpAt)
  expect((await st(app)).round).toBe(a.round + 1);
  await app.page.click('#scorepane [data-whoop]');
  // a real mouse pointer clicks and scores at once
  await app.page.click(sel);
  expect((await st(app)).round).toBe(a.round + 1);
  await app.page.click('#scorepane [data-whoop]');
  // an explicit stored 'double' still works as a double tap
  await app.run(pd => { pd.gprefs.scoreMode = 'double'; pd.renderGame(); });
  await touchTap(app, sel); expect((await st(app)).round).toBe(a.round);
  await touchTap(app, '#scorepane td.prev'); expect((await st(app)).round).toBe(a.round + 1);
  await app.page.click('#scorepane [data-whoop]');
});
