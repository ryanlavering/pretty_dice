// PD-202 part 1 (4.2): a design is a look. Picking one never changes the dice; its stored shape/notation is a
// "suggested dice" offered by the Suggested chip and only an explicit save rewrites it. Memo: docs/design/designs-sets-model.md
import { test, expect } from './helpers/app.mjs';

const SETUP = async pd => {
  const mk = (shape, substrate, name, notation) => ({ ...pd.designToJSON(), shape, substrate, name, ...(notation ? { notation } : {}) });
  await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'Look bag', designs: [
    { id: 'amethyst', name: 'Amethyst', design: mk('d20', 'swirl', 'Amethyst') },
    { id: 'bone', name: 'Bone', design: mk('d6', 'solid', 'Bone') },
    { id: 'gold', name: 'Gold', design: mk('custom', 'metal', 'Gold', '3d6+2') }],
  active: { design: 'bone' } }, { replace: true });
  pd.state.shape = 'd8'; pd.state.notation = '1d8';   // the player's own dice: none of the designs suggests these
};
const dice = app => app.run(pd => [pd.state.shape, pd.state.notation]);
const stored = app => app.run(pd => pd.bag.designs.map(d => [d.id, d.design.shape, d.design.notation]));

test.beforeEach(async ({ app }) => { await app.open(); await app.run(SETUP); });

test('#1 a pick in Play keeps the dice', async ({ app }) => {
  await app.nav.toPlay();
  await app.run(pd => pd.bagActivate('amethyst'));
  expect(await app.run(pd => pd.bag.active.design)).toBe('amethyst');
  expect(await app.run(pd => pd.state.substrate)).toBe('swirl');   // the look did change
  expect(await dice(app)).toEqual(['d8', '1d8']);
  expect(await app.page.locator('#suggest').count()).toBe(0);   // Play has no chip
});

test('#2 a pick in Design keeps the dice and offers them as a chip', async ({ app, page }) => {
  await app.nav.toDesign();
  expect(await page.locator('#suggest').count(), 'bone suggests d6, live is d8').toBe(1);
  await app.run(pd => pd.bagActivate('amethyst'));
  expect(await dice(app)).toEqual(['d8', '1d8']);
  await expect(page.locator('#suggest')).toHaveText('Suggested: d20');
  await app.run(pd => pd.bagActivate('gold'));
  await expect(page.locator('#suggest')).toHaveText('Suggested: 3d6+2');
  expect(await dice(app)).toEqual(['d8', '1d8']);
});

test('#9 tapping the chip applies the suggested dice in one undo step; it then disappears', async ({ app, page }) => {
  await app.nav.toDesign();
  await app.run(pd => pd.bagActivate('amethyst'));
  await page.locator('#suggest').click();
  expect((await dice(app))[0]).toBe('d20');
  await expect(page.locator('#suggest')).toHaveCount(0);
  await app.run(pd => pd.bagActivate('gold'));
  await page.locator('#suggest').click();
  expect(await dice(app)).toEqual(['custom', '3d6+2']);
  await expect(page.locator('#suggest')).toHaveCount(0);
  expect((await stored(app)).find(r => r[0] === 'gold')[1]).toBe('custom');   // applying never rewrites the suggestion
});

test('the chip is not rendered when the design suggests the live dice', async ({ app, page }) => {
  await app.run(pd => { pd.state.shape = 'd6'; });
  await app.nav.toDesign();
  await app.run(pd => pd.bagActivate('bone'));
  await expect(page.locator('#suggest')).toHaveCount(0);
});

test('#7 Load file, Duplicate and Remove-active keep the dice', async ({ app }) => {
  const r = await app.run(async pd => {
    const out = {};
    const d = { ...pd.designToJSON(), shape: 'd12', name: 'Loaded' };
    await pd.bagOps.addLoaded(d); out.loaded = [pd.state.shape, pd.state.notation, pd.bag.active.design];
    out.loadedSuggestion = pd.bag.designs.find(e => e.name === 'Loaded').design.shape;
    await pd.bagOps.duplicate('amethyst'); out.dup = [pd.state.shape, pd.state.notation];
    await pd.bagOps.remove(pd.bag.active.design); out.removed = [pd.state.shape, pd.state.notation];
    return out;
  });
  expect(r.loaded.slice(0, 2)).toEqual(['d8', '1d8']);
  expect(r.loadedSuggestion).toBe('d12');   // the file's own dice are its suggestion
  expect(r.dup).toEqual(['d8', '1d8']); expect(r.removed).toEqual(['d8', '1d8']);
});

test('#7 Load file in the Design room keeps the dice too', async ({ app }) => {
  await app.nav.toDesign();
  const r = await app.run(async pd => { await pd.bagOps.addLoaded({ ...pd.designToJSON(), shape: 'd4', name: 'Pyramid' }); return [pd.state.shape, pd.state.notation]; });
  expect(r).toEqual(['d8', '1d8']);
});

test('#8 import Replace keeps the dice', async ({ app }) => {
  const r = await app.run(async pd => {
    const f = pd.bagFileJSON(); f.active = { design: 'gold' };
    await pd.importBag(f, { replace: true });
    return [pd.state.shape, pd.state.notation, pd.bag.active.design];
  });
  expect(r).toEqual(['d8', '1d8', 'gold']);
});

test('Revert and Discard keep the dice', async ({ app }) => {
  const r = await app.run(async pd => {
    const out = {};
    await pd.bagActivate('amethyst');
    pd.state.substrate = 'solid'; pd.bagToJSON();   // a pending edit
    await pd.bagOps.revert(); out.revert = [pd.state.shape, pd.state.notation, pd.state.substrate];
    pd.randomize(); await pd.bagOps.discard(); out.discard = [pd.state.shape, pd.state.notation, pd.bag.active.design, pd.bag.active.draft];
    return out;
  });
  expect(r.revert).toEqual(['d8', '1d8', 'swirl']);
  expect(r.discard).toEqual(['d8', '1d8', 'amethyst', false]);
});

test('the suggestion survives picks and live edits (I3)', async ({ app }) => {
  const before = await stored(app);
  const r = await app.run(async pd => {
    await pd.bagActivate('amethyst'); pd.state.shape = 'd10'; pd.bagToJSON();
    await pd.bagActivate('gold'); pd.state.shape = 'd4'; pd.bagToJSON();
    await pd.bagActivate('bone'); pd.bagToJSON();
    return pd.bag.designs.map(d => [d.id, d.design.shape, d.design.notation]);
  });
  expect(r).toEqual(before);
});

test('only an explicit save writes the live dice as the suggestion (I3)', async ({ app }) => {
  const r = await app.run(async pd => {
    await pd.bagActivate('amethyst'); pd.state.shape = 'd10'; pd.state.substrate = 'solid';
    await pd.bagOps.save();
    const out = { saved: pd.bag.designs.find(d => d.id === 'amethyst').design.shape };
    await pd.bagActivate('bone'); pd.state.shape = 'd12'; pd.state.substrate = 'metal';
    await pd.bagOps.saveCopy();
    out.copy = pd.bag.designs.find(d => d.id === 'bone-copy').design.shape; out.orig = pd.bag.designs.find(d => d.id === 'bone').design.shape;
    return out;
  });
  expect(r).toEqual({ saved: 'd10', copy: 'd12', orig: 'd6' });
});
