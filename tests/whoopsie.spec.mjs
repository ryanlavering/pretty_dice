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
const total = app => app.page.locator('#scorepane tr.tot td').nth(1).textContent();

test('desktop mouse: a single click scores; touch: a single tap only previews, a double tap scores', async ({ shared: app }) => {
  await start(app, 51);
  const a = await st(app), t0 = await total(app), sel = '#scorepane td.pick.best, #scorepane td.pick';
  await touchTap(app, sel);
  await expect(app.page.locator('#scorepane td.prev')).toHaveCount(1);
  let b = await st(app); expect(b.rollsUsed).toBe(a.rollsUsed); expect(await total(app)).toBe(t0);
  expect(await app.page.locator('#dockhint').textContent()).toContain('to score it');
  await app.page.waitForTimeout(800);   // a slow second tap is only another preview
  await touchTap(app, '#scorepane td.prev');
  b = await st(app); expect(b.rollsUsed).toBe(a.rollsUsed);
  await touchTap(app, '#scorepane td.prev');   // the second tap inside 700 ms scores
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
  const ev = (type, ms) => app.page.evaluate(([type]) => { const el = document.querySelector('#scorepane td.pick.best, #scorepane td.pick'); if (!el) return; el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true })); if (type === 'pointerup') el.dispatchEvent(new PointerEvent('click', { pointerType: 'touch', bubbles: true })); }, [type]);
  await ev('pointerdown'); await app.page.waitForTimeout(150); await ev('pointerup');   // a short touch press only previews
  expect((await st(app)).round).toBe(a.round);
  await ev('pointerdown'); await app.page.waitForTimeout(700); await ev('pointerup');
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
