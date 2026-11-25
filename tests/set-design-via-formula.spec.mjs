// PD-214 (4.2): the set-level look row is gone. A set names a design through @design in its formula; picking a set never changes
// the active design; an old saved set-level look migrates to @design per die. Dice use applies a design to a one-term formula.
import { test, expect } from './helpers/app.mjs';

const SETUP = async pd => {
  const mk = (substrate, name) => ({ ...pd.designToJSON(), substrate, name });
  await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'Link bag', designs: [
    { id: 'plain', name: 'Plain', design: mk('solid', 'Plain') }, { id: 'amethyst', name: 'Amethyst', design: mk('swirl', 'Amethyst') }, { id: 'gold', name: 'Gold', design: mk('metal', 'Gold') }],
  sets: [{ id: 'lk', name: 'Linked', terms: [{ count: 2, sides: 6 }], mod: 0, design: 'amethyst' },
    { id: 'one', name: 'One', terms: [{ count: 2, sides: 6 }], mod: 0 },
    { id: 'two', name: 'Two', terms: [{ count: 2, sides: 6 }, { count: 1, sides: 8 }], mod: 0 },
    { id: 'has', name: 'Has', terms: [{ count: 2, sides: 6, design: 'gold' }], mod: 0 },
    { id: 'mixed', name: 'Mixed', terms: [{ count: 1, sides: 6 }, { count: 1, sides: 20, design: 'gold' }], mod: 0, design: 'amethyst' }],
  active: { design: 'plain' } }, { replace: true });
};
const editor = async (app, page, id) => { await app.nav.openBag(); await page.locator('#sheettabs [data-tab="sets"]').click(); await page.locator(`#setlist .setrow[data-id="${id}"] .pen`).click(); return page.locator('#setlist .seted'); };
const note = ed => ed.locator('.senote');

test.beforeEach(async ({ app }) => { await app.open(); await app.run(SETUP); });

test('migration: an imported set-level look becomes @design per die, own @design kept, field gone', async ({ app }) => {
  const r = await app.run(pd => pd.bag.sets.map(s => [s.id, 'design' in s, s.terms.map(t => t.design || null)]));
  expect(r).toEqual([['lk', false, ['amethyst']], ['one', false, [null]], ['two', false, [null, null]], ['has', false, ['gold']], ['mixed', false, ['amethyst', 'gold']]]);
});

test('migration: a stored bag with a set-level look migrates on load and persists, idempotent', async ({ app, page }) => {
  await page.evaluate(() => { const j = JSON.parse(localStorage.getItem('prettydice.bag.v1')); j.sets.find(s => s.id === 'one').design = 'gold'; localStorage.setItem('prettydice.bag.v1', JSON.stringify(j)); });
  await page.reload(); await page.waitForFunction(() => window.__pd && window.__pd.bag);
  const read = () => page.evaluate(() => { const st = JSON.parse(localStorage.getItem('prettydice.bag.v1')).sets.find(s => s.id === 'one'); return [st.terms[0].design || null, 'design' in st]; });
  expect(await read()).toEqual(['gold', false]);
  await page.reload(); await page.waitForFunction(() => window.__pd && window.__pd.bag);
  expect(await read()).toEqual(['gold', false]);
});

test('picking a set no longer changes the active design', async ({ app }) => {
  await app.run(pd => pd.bagActivate('gold'));
  await app.run(pd => pd.setOps.open('lk'));
  expect(await app.run(pd => [pd.bag.active.design, pd.state.substrate, pd.state.notation])).toEqual(['gold', 'metal', '2d6@amethyst']);
  await app.run(pd => pd.setOps.open('one'));
  expect(await app.run(pd => pd.bag.active.design)).toBe('gold');
});

test('set editor: the Use design for this set row is gone', async ({ app, page }) => {
  const ed = await editor(app, page, 'one');
  await expect(ed).toBeVisible();
  await expect(page.locator('#setlist .selook')).toHaveCount(0);
  await expect(page.getByText('Use design for this set')).toHaveCount(0);
  await expect(ed.locator('.row2 select')).toHaveCount(1);               // Dice use stays
});

const dice = ed => ed.locator('.row2 select');
const all = ed => ed.locator('button.applyall');

test('Dice use alone adds a new term and never touches existing ones (single term too)', async ({ app, page }) => {
  const ed = await editor(app, page, 'one');
  await dice(ed).selectOption('amethyst');
  await expect(note(ed)).toHaveValue('2d6');                              // no auto-apply
  await ed.locator('button[aria-label="Add a d4"]').click();
  await expect(note(ed)).toHaveValue('2d6+1d4@amethyst');
});

test('Dice use with an existing design keeps today\'s behaviour', async ({ app, page }) => {
  const ed = await editor(app, page, 'has');
  await dice(ed).selectOption('amethyst');
  await expect(note(ed)).toHaveValue('2d6@gold');
  await ed.locator('button[aria-label="Add a d4"]').click();
  await expect(note(ed)).toHaveValue('2d6@gold+1d4@amethyst');
});

test('Apply to all: writes the design on every term (overwriting), Active design removes it', async ({ app, page }) => {
  const ed = await editor(app, page, 'one');
  await dice(ed).selectOption('amethyst'); await all(ed).click();
  await expect(note(ed)).toHaveValue('2d6@amethyst');
  await dice(ed).selectOption('gold');
  await ed.locator('button[aria-label="Add a d4"]').click();
  await expect(note(ed)).toHaveValue('2d6@amethyst+1d4@gold');
  await all(ed).click();
  await expect(note(ed)).toHaveValue('2d6@gold+1d4@gold');
  await dice(ed).selectOption('');
  await all(ed).click();
  await expect(note(ed)).toHaveValue('2d6+1d4');
});

test('Apply to all is hidden like Dice use with a one-design bag', async ({ app, page }) => {
  await app.run(pd => { for (const id of ['amethyst', 'gold']) pd.bagOps.remove(id); });
  const ed = await editor(app, page, 'one');
  await expect(all(ed)).toBeHidden();
  await expect(dice(ed)).toBeHidden();
});

for (const [w, h] of [[1280, 800], [390, 740]]) test(`Apply to all shares the Dice use row, or wraps right-aligned under the dropdown (${w}x${h})`, async ({ app, page }) => {
  await page.setViewportSize({ width: w, height: h });
  const ed = await editor(app, page, 'one');
  const sb = await dice(ed).boundingBox(), bb = await all(ed).boundingBox();
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  expect(bb.x + bb.width).toBeLessThanOrEqual(vw + 0.5); expect(sb.width).toBeGreaterThan(60);
  if (Math.abs((bb.y + bb.height / 2) - (sb.y + sb.height / 2)) < sb.height) expect(bb.x).toBeGreaterThanOrEqual(sb.x + sb.width - 0.5);   // same row, button right of the dropdown
  else { expect(bb.y).toBeGreaterThanOrEqual(sb.y + sb.height - 0.5); expect(Math.abs(bb.x + bb.width - (sb.x + sb.width))).toBeLessThan(1.5); }   // wrapped: directly under, right edges aligned
  expect(Math.abs((bb.y + bb.height / 2) - (sb.y + sb.height / 2))).toBeLessThan(sb.height);   // at both widths the real layout fits on one row
  await page.screenshot({ path: `/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/seted-${w}.png` });
});
