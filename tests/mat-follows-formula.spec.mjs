// PD-215: the mat follows the quick roll formula. A chip or a typed formula (on blur) lays the dice down unrolled;
// a blur caused by pressing Roll places nothing first; a bad or empty formula leaves the mat; a running game owns the mat.
import { test, expect } from './helpers/app.mjs';

const mat = app => app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation, shape: pd.state.shape, log: document.querySelectorAll('#log li, #logpane .row').length }));
const box = app => app.page.locator('#rollbox');
const blur = app => app.page.evaluate(() => document.getElementById('rollbox').blur());
const open = async (app, own) => { await app.open({ plain: true }); if (own) await OWN(app); await app.nav.toPlay(); };
const OWN = async app => { await app.run(pd => { pd.state.shape = 'custom'; pd.state.notation = '3d8+1'; pd.buildDice(); }); };

test('a chip tap lays down its die; double-click adds one; nothing is thrown', async ({ app }) => {
  await open(app, true);
  await app.page.locator('#qbar [data-die="20"]').click(); await app.page.waitForTimeout(500);
  expect(await box(app).inputValue()).toBe('1d20');
  expect(await mat(app)).toMatchObject({ n: 1, shape: 'd20' });
  await app.page.locator('#qbar [data-die="20"]').dblclick(); await app.page.waitForTimeout(500);
  expect(await box(app).inputValue()).toBe('2d20');
  expect(await mat(app)).toMatchObject({ n: 2, notation: '2d20' });
});

test('rapid chip taps settle on the last die without errors', async ({ app }) => {
  await open(app); const errs = []; app.page.on('pageerror', e => errs.push(e.message));
  for (const n of [6, 8, 12, 20]) await app.page.locator(`#qbar [data-die="${n}"]`).click({ delay: 0 });
  await app.page.waitForTimeout(800);
  expect(await mat(app)).toMatchObject({ n: 1, shape: 'd20' }); expect(errs).toEqual([]);
});

test('a typed formula places its dice when the box loses focus', async ({ app }) => {
  await open(app, true);
  await box(app).fill('4d6+2'); expect(await mat(app), 'typing alone does nothing').toMatchObject({ n: 3, notation: '3d8+1' });
  await blur(app); await app.page.waitForTimeout(300);
  expect(await mat(app)).toMatchObject({ n: 4, notation: '4d6+2' });
});

test('blur by pressing Roll does not place first; the roll lands the dice', async ({ app }) => {
  await open(app, true);
  await app.run(() => { window.__placed = 0; const b = document.getElementById('rollbox'); b.addEventListener('focusout', () => { window.__snap = 1; }); });
  await box(app).fill('2d10'); const before = await app.run(pd => pd.dice.length);
  await app.page.evaluate(() => { const g = document.getElementById('rollbtn'); g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' })); document.getElementById('rollbox').blur(); });
  expect(await app.run(pd => pd.dice.length), 'no placement on the blur').toBe(before);
  await app.page.evaluate(() => document.getElementById('rollbtn').click());
  expect(await mat(app)).toMatchObject({ n: 2, notation: '2d10' });
});

test('an invalid or empty formula leaves the mat alone', async ({ app }) => {
  await open(app, true);
  await box(app).fill('4d'); await blur(app); await app.page.waitForTimeout(200);
  expect(await mat(app)).toMatchObject({ n: 3, notation: '3d8+1' });
  await box(app).fill(''); await blur(app);
  expect(await mat(app)).toMatchObject({ n: 3, notation: '3d8+1' });
  await box(app).fill('4d'); await box(app).press('Enter');
  expect(await box(app).getAttribute('class')).toContain('bad');
});

test('placing is idempotent and Undo steps back once, like a set pick', async ({ app }) => {
  await open(app, true);
  await box(app).fill('2d12'); await blur(app); await app.page.waitForTimeout(200);
  const ids = await app.run(pd => pd.dice.map(d => d.mesh?.uuid ?? d.id ?? 0));
  await box(app).focus(); await box(app).fill('2d12 '); await blur(app);
  expect(await app.run(pd => pd.dice.map(d => d.mesh?.uuid ?? d.id ?? 0))).toEqual(ids);
  await app.run(pd => pd.undo && pd.undo()); await app.page.waitForTimeout(200);
  expect(await mat(app)).toMatchObject({ notation: '3d8+1' });
});

test('a running game keeps the mat when the box is edited', async ({ app }) => {
  await open(app); await app.run(pd => pd.openGames()); await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
  await app.run(pd => { pd.step(20); pd.renderOnce(); }); await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 }));
  expect(await app.run(pd => !!pd.game && !pd.game.setup), 'a game is running').toBe(true);
  const before = await mat(app);
  await app.page.evaluate(() => { const b = document.getElementById('rollbox'); b.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); b.value = '2d8'; b.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });   // the box is hidden while a game runs, so drive the events directly
  await app.page.waitForTimeout(200);
  expect((await mat(app)).n).toBe(before.n);
  await app.run(pd => pd.endGame());
});

test('a typed formula in the game lobby releases the hold and places its dice', async ({ app }) => {
  await open(app, true); await app.run(pd => pd.openGames()); await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
  expect(await app.run(pd => !!pd.bag.hold)).toBe(true);
  await box(app).fill('2d8'); await blur(app); await app.page.waitForTimeout(300);
  expect(await app.run(pd => pd.bag.hold)).toBeNull();
  expect(await mat(app)).toMatchObject({ n: 2, notation: '2d8' });
});

test('a set named in the box places via the set path on blur (no roll)', async ({ app }) => {
  await open(app);
  await app.run(pd => pd.setOps.create({ name: 'Goblins', terms: [{ count: 4, sides: 10 }], mod: 0 })); await app.page.waitForTimeout(200);
  await box(app).fill('goblins'); await blur(app); await app.page.waitForTimeout(400);
  expect(await mat(app)).toMatchObject({ n: 4, notation: '4d10' });
  expect(await app.run(pd => pd.rollSetId ?? pd.bag.active.set)).toBeTruthy();
  expect(await box(app).inputValue()).toBe('');
});
