// Dice bag phase 2 (PD-102): pending edits (Modified), random draft, and the bag operations behind the shelf and sheet.
import { test, expect } from './helpers/app.mjs';

// A bag of three designs, built through the public loader, with `bone` active.
const SETUP = async pd => {
  const mk = (shape, substrate, name) => ({ ...pd.designToJSON(), shape, substrate, name });
  await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'Test bag', designs: [
    { id: 'amethyst', name: 'Amethyst', design: mk('d20', 'swirl', 'Amethyst') },
    { id: 'bone', name: 'Bone', design: mk('d6', 'solid', 'Bone') },
    { id: 'gold', name: 'Gold', design: mk('d8', 'metal', 'Gold') }], active: { design: 'bone' } }, { replace: true });
};

test.beforeEach(async ({ shared }) => { await shared.reset(1); await shared.run(SETUP); });

test('editing marks the active design Modified; Save, Revert and Save as copy', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const out = {}; out.clean = pd.isModified('bone');
    pd.state.radius = 0.1; out.edited = pd.isModified('bone');
    out.shapeOnly = (() => { pd.state.radius = pd.bag.designs[1].design.edge_radius; pd.state.shape = 'd12'; return pd.isModified('bone'); })();   // shape is only a preview shape
    pd.state.shape = 'd6'; pd.state.radius = 0.1;
    await pd.bagActivate('gold'); out.pendingKept = !!pd.bag.pending.bone; out.boneStillModified = pd.isModified('bone'); out.goldClean = pd.isModified('gold');
    await pd.bagActivate('bone'); out.radiusBack = pd.state.radius; out.activeEdited = pd.isModified('bone');
    await pd.bagOps.revert(); out.afterRevert = { mod: pd.isModified('bone'), radius: pd.state.radius === 0.1, pending: Object.keys(pd.bag.pending) };
    pd.state.radius = 0.12; await pd.bagOps.save(); out.afterSave = { mod: pd.isModified('bone'), saved: pd.bag.designs[1].design.edge_radius };
    pd.state.radius = 0.13; await pd.bagOps.saveCopy();
    out.copy = { ids: pd.bag.designs.map(d => d.id), active: pd.bag.active.design, names: pd.bag.designs.map(d => d.name), origSaved: pd.bag.designs[1].design.edge_radius, origMod: pd.isModified('bone') };
    return out;
  });
  expect(r.clean).toBe(false); expect(r.edited).toBe(true); expect(r.shapeOnly).toBe(false);
  expect(r.pendingKept).toBe(true); expect(r.boneStillModified).toBe(true); expect(r.goldClean).toBe(false);
  expect(r.radiusBack).toBe(0.1); expect(r.activeEdited).toBe(true);
  expect(r.afterRevert).toEqual({ mod: false, radius: false, pending: [] });
  expect(r.afterSave).toEqual({ mod: false, saved: 0.12 });
  expect(r.copy.ids).toEqual(['amethyst', 'bone', 'bone-copy', 'gold']);
  expect(r.copy.active).toBe('bone-copy'); expect(r.copy.names[2]).toBe('Bone copy');
  expect(r.copy.origSaved).toBe(0.12); expect(r.copy.origMod).toBe(false);
});

test('pending edits are exported and survive a reload', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await app.run(async pd => { pd.state.radius = 0.11; pd.save(); await pd.bagActivate('gold'); pd.state.radius = 0.09; pd.save(); });   // edits stay pending
  await page.reload(); await app.ready();
  const r = await app.run(pd => ({ active: pd.bag.active.design, goldMod: pd.isModified('gold'), boneMod: pd.isModified('bone'), radius: pd.state.radius, exported: Object.keys(pd.bagToJSON().pending).sort() }));
  expect(r).toEqual({ active: 'gold', goldMod: true, boneMod: true, radius: 0.09, exported: ['bone', 'gold'] });
});

test('Randomize makes one draft; it never touches saved designs; Keep and Discard', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const out = {}, before = JSON.stringify(pd.bag.designs);
    pd.randomize(true); const d1 = JSON.stringify(pd.bagToJSON().draft);
    pd.randomize(true); const d2 = JSON.stringify(pd.bagToJSON().draft);
    out.draftActive = pd.bag.active.draft; out.replaced = d1 !== d2; out.savedUntouched = JSON.stringify(pd.bag.designs) === before; out.pending = Object.keys(pd.bag.pending);
    await pd.bagActivate('gold'); out.slotKept = !!pd.bag.draft && !pd.bag.active.draft;
    await pd.bagActivate('draft'); out.backOnDraft = pd.bag.active.draft;
    await pd.bagOps.keep(); out.kept = { n: pd.bag.designs.length, draft: pd.bag.draft, active: pd.bag.active.draft, name: pd.bag.designs.at(-1).name };
    pd.randomize(true); await pd.bagOps.discard(); out.discarded = { draft: pd.bag.draft, active: pd.bag.active.draft, on: pd.bag.active.design, n: pd.bag.designs.length };
    return out;
  });
  expect(r.draftActive).toBe(true); expect(r.replaced).toBe(true); expect(r.savedUntouched).toBe(true); expect(r.pending).toEqual([]);
  expect(r.slotKept).toBe(true); expect(r.backOnDraft).toBe(true);
  expect(r.kept).toEqual({ n: 4, draft: null, active: false, name: 'Design 4' });
  expect(r.discarded).toEqual({ draft: null, active: false, on: r.kept && r.discarded.on, n: 4 });
});

test('duplicate, rename, move, delete', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const out = {}, ids = () => pd.bag.designs.map(d => d.id);
    await pd.bagOps.duplicate('amethyst'); out.dup = { ids: ids(), active: pd.bag.active.design };
    pd.bagOps.rename('amethyst', 'Purple'); out.renamed = pd.bag.designs[0].name;
    pd.bagOps.move('gold', 0); out.moved = ids(); pd.bagOps.move('gold', 99); out.movedEnd = ids();
    out.deleteActive = await pd.bagOps.remove(pd.bag.active.design); out.afterDelete = { ids: ids(), active: pd.bag.active.design, notModified: !pd.isModified(pd.bag.active.design) };
    await pd.bagOps.remove('gold'); await pd.bagOps.remove('bone'); out.lastRefused = await pd.bagOps.remove(pd.bag.designs[0].id); out.left = ids();
    return out;
  });
  expect(r.dup).toEqual({ ids: ['amethyst', 'amethyst-copy', 'bone', 'gold'], active: 'amethyst-copy' });
  expect(r.renamed).toBe('Purple');
  expect(r.moved).toEqual(['gold', 'amethyst', 'amethyst-copy', 'bone']); expect(r.movedEnd).toEqual(['amethyst', 'amethyst-copy', 'bone', 'gold']);
  expect(r.deleteActive).toBe(true); expect(r.afterDelete.ids).toEqual(['amethyst', 'bone', 'gold']); expect(r.afterDelete.notModified).toBe(true);
  expect(r.lastRefused).toBe(false); expect(r.left).toHaveLength(1);
});

test('shelf and sheet show the bag; tapping a card picks it', async ({ app, page }) => {
  await app.open({ query: 'thumbs=1' });
  await app.run(SETUP);
  await expect(page.locator('#cards .card[data-id]')).toHaveCount(3);
  await expect(page.locator('#cards .card.on .nm')).toHaveText('Bone');
  await page.locator('#cards .card[data-id="gold"]').click();
  await expect.poll(() => app.run(pd => pd.bag.active.design)).toBe('gold');
  await expect.poll(() => app.run(pd => pd.state.shape)).toBe('d8');
  await page.locator('#bagopen').click();
  await expect(page.locator('#tiles .tile[data-id]')).toHaveCount(3);
  // drag the last tile to the front
  const tiles = page.locator('#tiles .tile[data-id]'), a = await tiles.nth(2).boundingBox(), b = await tiles.nth(0).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(a.x + a.width / 2 - 20, a.y + a.height / 2, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => app.run(pd => pd.bag.designs.map(d => d.id))).toEqual(['gold', 'amethyst', 'bone']);
  await page.keyboard.press('Escape'); await expect(page.locator('#bagsheet')).toBeHidden();
});
