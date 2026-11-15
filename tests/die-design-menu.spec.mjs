// PD-142.38 slice 8: long-press (or right-click) a die in the Play room to change that one die's design.
import { test, expect } from './helpers/app.mjs';

test.beforeEach(async ({ shared }) => { await shared.reset(11); await shared.run(pd => pd.endGame()); });

const setup = async app => {
  await app.run(async pd => { await pd.bagOps.addBlank(); pd.state.shape = 'custom'; pd.state.notation = '3d6'; pd.buildDice(); pd.startRoll(false, false); });
  await app.run(pd => { pd.pause(); pd.simRoll(); pd.renderOnce(); });
};
const faces = app => app.run(pd => pd.faces.join(','));
const designs = app => app.run(pd => pd.dice.map(d => d.design || null));

test('long-press opens the design menu without holding the die; picking re-skins only that die, keeps faces and the total', async ({ shared: app }) => {
  await setup(app); const page = app.page;
  const f0 = await faces(app), tot0 = await app.run(pd => document.getElementById('result').textContent);
  const pt = await app.run(pd => pd.dieScreen(1));
  await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.waitForTimeout(650);
  await expect(page.locator('#cardmenu')).toBeVisible(); await page.mouse.up();
  expect(await app.run(pd => pd.held), 'long-press does not hold').toEqual([]);
  const other = await app.run(pd => pd.bag.designs.find(d => d.id !== pd.bag.active.design).id);
  await page.locator('#cardmenu button', { hasText: await app.run(pd => pd.bag.designs.find(d => d.id !== pd.bag.active.design).name) }).click();
  await page.waitForTimeout(300);
  expect(await app.run(pd => pd.dice.length)).toBe(3);
  const ds = await designs(app); expect(ds[1]).toBe(other); expect(ds[0]).toBeFalsy(); expect(ds[2]).toBeFalsy();
  expect(await faces(app)).toBe(f0);
  expect(await app.run(pd => document.getElementById('result').textContent)).toBe(tot0);
});

test('a short tap still holds a die and opens no menu', async ({ shared: app }) => {
  await setup(app); const page = app.page, pt = await app.run(pd => pd.dieScreen(0));
  await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(700);
  await expect(page.locator('#cardmenu')).toBeHidden(); expect(await app.run(pd => pd.held)).toHaveLength(1);
});

test('no menu outside the Play room', async ({ shared: app }) => {
  await setup(app);
  expect(await app.run(pd => pd.dieMenu(0))).toBe(true);
  await app.page.keyboard.press('Escape'); await app.page.mouse.click(5, 5);
  await app.nav.toDesign();
  expect(await app.run(pd => pd.dieMenu(0)), 'not in the Play room').toBe(false);
});
