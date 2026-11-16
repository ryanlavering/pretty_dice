// PD-142.38 slice 5: the panel is sorted into room tabs (Design = Look/Bag/Sets, Play = Table/Games/Log); Reset to defaults lives in the drawer.
import { test, expect } from './helpers/app.mjs';
test.beforeEach(async ({ shared }) => { await shared.reset(7); await shared.run(pd => pd.endGame()); });
test.describe('room tabs', () => {
  test('Design shows Look, Bag, Sets; Play shows Table, Games, Log', async ({ shared: app }) => {
    const p = app.page; await app.nav.toDesign();
    const vis = () => p.$$eval('#paneltabs button', bs => bs.filter(b => getComputedStyle(b).display !== 'none').map(b => b.dataset.pane));
    expect(await vis()).toEqual(['look', 'bag', 'sets']);
    await app.nav.toPlay();
    expect(await vis()).toEqual(['table', 'games', 'log']);
  });
  test('Look holds the design controls, Table the dice chips and roll feel; the last tab per room is kept', async ({ shared: app }) => {
    const p = app.page; await app.nav.toDesign();
    await expect(p.locator('#shapes')).toBeVisible(); await expect(p.locator('#dicechips')).toBeHidden(); await expect(p.locator('#sec-roll')).toBeHidden();
    await app.nav.toPlay();
    await expect(p.locator('#sec-dice'), 'PD-142.38.23: no Dice to roll section in the Table tab').toBeHidden(); await expect(p.locator('#sec-roll')).toBeVisible(); await expect(p.locator('#shapes'), 'PD-142.38.12: Shape is also in the Table tab').toBeVisible(); await expect(p.locator('#subs')).toBeHidden();
    await expect(p.locator('#paneltabs button[data-pane=table]')).toHaveAttribute('aria-selected', 'true');
    await app.nav.toDesign(); await expect(p.locator('#paneltabs button[data-pane=look]')).toHaveAttribute('aria-selected', 'true');
  });
  test('Bag and Sets tabs open the sheet on their tab', async ({ shared: app }) => {
    const p = app.page; await app.nav.toDesign();
    await p.click('#paneltabs button[data-pane=sets]'); await expect(p.locator('#bagsheet')).toBeVisible(); await expect(p.locator('#setlist')).toBeVisible();
  });
  test('Reset to defaults is a drawer item, not in the panel', async ({ shared: app }) => {
    const p = app.page; expect(await p.locator('aside #reset').count()).toBe(0);
    await app.nav.openDrawer(); await expect(p.locator('#dmenu #reset')).toBeVisible();
  });
});

test.describe('dock preset chips (owner 2026-11-14)', () => {
  test('phone: the dock has die, Adv/Dis chips after Roll; they load the box and never throw', async ({ shared: app }) => {
    const p = app.page; await p.setViewportSize({ width: 390, height: 844 }); await app.nav.toPlay();
    await app.run(pd => pd.simRoll()); await p.fill('#rollbox', '');
    const chip = p.locator('#qbar .dchip[data-die="20"]'); await chip.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await expect(chip).toBeVisible();
    const tot0 = await app.run(pd => document.getElementById('result').textContent);
    await chip.click(); await expect(p.locator('#rollbox')).toHaveValue('1d20');   // PD-142.38.11: a tap replaces, a double-click adds
    await p.waitForTimeout(500); await chip.dblclick();
    await expect(p.locator('#rollbox')).toHaveValue(/2d20/);
    expect(await app.run(pd => ({ throwing: document.body.classList.contains('throwing'), r: document.getElementById('result').textContent }))).toEqual({ throwing: false, r: tot0 });
    await expect(p.locator('#qbar .dchip[data-adv="h"]')).toHaveCount(1);
  });
  test('the Table tab keeps its own chips', async ({ shared: app }) => {
    await app.nav.toPlay(); await expect(app.page.locator('#qbar .dchip[data-die="20"]')).toBeVisible();
  });
});

test.describe('owner phone review 2026-11-14', () => {
  test('a typed formula equal to the dice on the mat reuses them and keeps the holds (PD-142.1.1)', async ({ shared: app }) => {
    const p = app.page; await app.nav.toPlay();
    await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '3d6'; await pd.buildDice(); pd.simRoll(); window.__i = [0, 1, 2].find(i => pd.toggleHold(i)); window.__ok = window.__i !== undefined; window.__d1 = pd.dice[window.__i]; });
    expect(await app.run(() => window.__ok), 'a die can be held').toBe(true);
    await p.fill('#rollbox', '3d6'); await p.click('#rollbtn');
    expect(await app.run(pd => pd.held), 'the hold survives the typed roll').toEqual([await app.run(() => window.__i)]);
    expect(await app.run(pd => pd.dice[window.__i] === window.__d1), 'the same die objects are reused').toBe(true);
  });
  test('the formula box dismisses on an outside tap and asks for a Done key (PD-142.14.1.6.3)', async ({ shared: app }) => {
    const p = app.page; await app.nav.toPlay();
    await expect(p.locator('#rollbox')).toHaveAttribute('enterkeyhint', 'done');
    await p.focus('#rollbox'); await p.mouse.click(300, 300);
    expect(await app.run(() => document.activeElement.id)).not.toBe('rollbox');
  });
  test("Tiger's eye paints the preset colours with cream numbers (PD-142.21.1)", async ({ shared: app }) => {
    const p = app.page; await app.nav.toDesign();
    await app.run(pd => { pd.state.substrate = 'marble'; });
    await p.evaluate(() => { const s = document.getElementById('stone'); s.value = 'tigerseye'; s.dispatchEvent(new Event('change')); document.getElementById('stonepaint').click(); });
    expect(await app.run(pd => ({ c: pd.state.colors, n: pd.state.paint }))).toEqual({ c: ['#6b4f27', '#7e5c00', '#c88a28'], n: '#f3e6c4' });
  });
});
