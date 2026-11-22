// PD-202 part 2 (4.2): a set may name a design. Picking the set brings that look (look-only, every time) unless the set has
// no link ("Follow selection"). Memo: docs/design/designs-sets-model.md rows #11, #13, edge cases E2-E5.
import { test, expect } from './helpers/app.mjs';

const SETUP = async pd => {
  const mk = (substrate, name) => ({ ...pd.designToJSON(), substrate, name });
  await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'Link bag', designs: [
    { id: 'plain', name: 'Plain', design: mk('solid', 'Plain') }, { id: 'amethyst', name: 'Amethyst', design: mk('swirl', 'Amethyst') }, { id: 'gold', name: 'Gold', design: mk('metal', 'Gold') }],
  sets: [{ id: 'lk', name: 'Linked', terms: [{ count: 2, sides: 6 }], mod: 0, design: 'amethyst' },
    { id: 'nolk', name: 'Plain set', terms: [{ count: 3, sides: 8 }], mod: 0 },
    { id: 'mixed', name: 'Mixed', terms: [{ count: 1, sides: 6 }, { count: 1, sides: 20, design: 'gold' }], mod: 0, design: 'amethyst' }],
  active: { design: 'plain' } }, { replace: true });
};
const look = app => app.run(pd => [pd.bag.active.design, pd.state.substrate, pd.state.shape, pd.state.notation]);

test.beforeEach(async ({ app }) => { await app.open(); await app.run(SETUP); });

test('#11 picking a linked set applies the look every time, set dice stay', async ({ app }) => {
  expect((await look(app))[0]).toBe('plain');
  await app.run(pd => pd.setOps.open('lk'));
  expect(await look(app)).toEqual(['amethyst', 'swirl', 'custom', '2d6']);
  await app.run(pd => pd.bagActivate('gold'));                              // restyle by hand
  await app.run(pd => pd.setOps.open('lk'));                                // picked again: the link fires again
  expect(await look(app)).toEqual(['amethyst', 'swirl', 'custom', '2d6']);
});

test('keep my look: a set without a link leaves the look', async ({ app }) => {
  await app.run(pd => pd.bagActivate('gold'));
  await app.run(pd => pd.setOps.open('nolk'));
  expect(await look(app)).toEqual(['gold', 'metal', 'custom', '3d8']);
});

test('E2 a deleted design drops the link; a stale id is ignored at pick time', async ({ app }) => {
  await app.run(pd => { pd.bag.sets.find(s => s.id === 'nolk').design = 'ghost'; });
  await app.run(pd => pd.setOps.open('nolk'));
  expect(await look(app)).toEqual(['plain', 'solid', 'custom', '3d8']);
  await app.run(pd => pd.bagOps.remove('amethyst'));
  expect(await app.run(pd => pd.bag.sets.map(s => s.design))).toEqual([undefined, 'ghost', undefined]);
});

test('E3 no re-apply after restyling and rolling the formula box', async ({ app }) => {
  await app.run(pd => pd.setOps.open('lk'));
  await app.run(pd => pd.bagActivate('gold'));
  await app.page.fill('#rollbox', '2d6'); await app.page.press('#rollbox', 'Enter');
  expect((await look(app))[0]).toBe('gold');
});

test('E4 the design already active is not reloaded (no undo reset)', async ({ app }) => {
  await app.run(pd => pd.bagActivate('amethyst'));
  await app.run(pd => pd.setOps.open('lk'));
  expect(await look(app)).toEqual(['amethyst', 'swirl', 'custom', '2d6']);
});

test('E5 per-term @design keeps its look in a linked set (quick roll log chip)', async ({ app }) => {
  await app.run(pd => pd.setOps.quick('mixed'));
  const items = await app.run(pd => pd.bag.log[0].items.map(i => [i.sides, i.design]));
  expect(items).toEqual([[6, 'amethyst'], [20, 'gold']]);
  expect(await look(app).then(l => l[0])).toBe('plain');                    // quick roll never changes the look
});

test('#13 in a running game a same-dice linked set applies the look only; other dice are declined with no look change', async ({ app }) => {
  await app.run(pd => { pd.bag.sets.find(s => s.id === 'lk').terms = [{ count: 5, sides: 6 }]; return pd.startGame('yahtzee', ['P1'], {}, []); });
  await app.run(pd => pd.setOps.open('nolk'));                              // 3d8: declined
  expect(await app.run(pd => pd.bag.active.design)).toBe('plain');
  await app.run(pd => pd.setOps.open('lk'));                                // 5d6: same dice
  expect(await app.run(pd => pd.bag.active.design)).toBe('amethyst');
  expect(await app.run(pd => pd.state.substrate)).toBe('swirl');
});

test('set editor Look row: shown with 2+ designs, writes set.design; Follow selection clears it', async ({ app, page }) => {
  await app.nav.openBag(); await page.locator('#sheettabs [data-tab="sets"]').click();
  await page.locator('#setlist .setrow[data-id="lk"] .pen').click();
  const sel = page.locator('#setlist .seted .selook select');
  await expect(sel).toHaveValue('amethyst');
  await sel.selectOption('gold'); await page.locator('#setlist .seted .sesave').first().click();
  expect(await app.run(pd => pd.bag.sets.find(s => s.id === 'lk').design)).toBe('gold');
  await expect(page.locator('#setlist .setrow[data-id="lk"] .lookchip')).toHaveCount(1);
  await page.locator('#setlist .setrow[data-id="lk"] .pen').click();
  await page.locator('#setlist .seted .selook select').selectOption('');
  await page.locator('#setlist .seted .sesave').first().click();
  expect(await app.run(pd => 'design' in pd.bag.sets.find(s => s.id === 'lk'))).toBe(false);
});

test('a one-design bag hides the Look row and chip', async ({ app, page }) => {
  await app.run(pd => { for (const id of ['amethyst', 'gold']) pd.bagOps.remove(id); });
  await app.nav.openBag(); await page.locator('#sheettabs [data-tab="sets"]').click();
  await page.locator('#setlist .setrow[data-id="nolk"] .pen').click();
  await expect(page.locator('#setlist .seted .selook')).toBeHidden();
  await expect(page.locator('#setlist .lookchip')).toHaveCount(0);
});
