// Dice bag phase 1 (PD-102): data model, migration, storage, file round trip. Logic tier: no pixel checks.
import { test, expect } from './helpers/app.mjs';


test('first run turns the saved settings into a bag of one, stored under its own key', async ({ app }) => {
  await app.open({ storage: { 'prettydice.v1': { shape: 'd12', substrate: 'metal', notation: '3d8' } } });
  const r = await app.run(pd => ({ bag: pd.bagToJSON(), stored: JSON.parse(localStorage.getItem('prettydice.bag.v1')), v1: !!localStorage.getItem('prettydice.v1') }));
  expect(r.bag.format).toBe('pretty-dice-bag');
  expect(r.bag.designs).toHaveLength(1);
  expect(r.bag.designs[0].design).toMatchObject({ format: 'pretty-dice', shape: 'd12', substrate: 'metal', notation: '3d8' });
  expect(r.bag.active.design).toBe(r.bag.designs[0].id);
  expect(r.stored.designs).toHaveLength(1);
  expect(r.v1).toBe(true);   // today's key is untouched
});

test('a bag with several designs saves, reloads and survives a page reload', async ({ app, page }) => {
  await app.open();
  const before = await app.run(async pd => {
    const mk = (shape, substrate, name) => ({ ...pd.designToJSON(), shape, substrate, name });
    const file = { format: 'pretty-dice-bag', version: 1, name: 'Test bag',
      designs: [
        { id: 'amethyst', name: 'Amethyst', design: mk('d20', 'swirl', 'Amethyst') },
        { id: 'bone', name: 'Bone', design: mk('d6', 'solid', 'Bone') },
        { id: 'gold', name: 'Gold', design: mk('d8', 'metal', 'Gold') }],
      sets: [{ id: 'mixed', name: 'Mixed', terms: [{ count: 1, sides: 20, design: 'amethyst' }, { count: 2, sides: 6, design: 'bone' }], mod: { flat: 2, stats: [] } }],
      characters: [{ id: 'vex', name: 'Vex', stats: { wis: 3 } }],
      active: { design: 'bone', set: 'mixed' }, log: [{ t: '2026-11-11T19:02:11Z', set: 'mixed', dice: [[20, 12]], mod: 2, total: 14 }] };
    await pd.importBag(file, { replace: true });
    return { file, shape: pd.state.shape, substrate: pd.state.substrate };
  });
  // the active design is now live in the app
  expect(before.shape).toBe('d6'); expect(before.substrate).toBe('solid');
  await page.reload(); await app.ready();
  const after = await app.run(pd => ({ bag: pd.bagToJSON(), shape: pd.state.shape }));
  expect(after.bag.name).toBe('Test bag');
  expect(after.bag.designs.map(d => d.id)).toEqual(['amethyst', 'bone', 'gold']);
  expect(after.bag.designs.map(d => d.design.shape)).toEqual(['d20', 'd6', 'd8']);
  expect(after.bag.sets).toEqual(before.file.sets);
  expect(after.bag.characters).toEqual(before.file.characters);
  expect(after.bag.log).toEqual(before.file.log);
  expect(after.bag.active).toEqual({ design: 'bone', set: 'mixed', draft: false });
  expect(after.shape).toBe('d6');
});

test('export then re-import reproduces the bag; import adds and renames id clashes', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const mk = (shape, name) => ({ ...pd.designToJSON(), shape, name });
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'A', designs: [{ id: 'amethyst', name: 'Amethyst', design: mk('d20', 'Amethyst') }, { id: 'bone', name: 'Bone', design: mk('d6', 'Bone') }] }, { replace: true });
    const exported = pd.bagToJSON();
    await pd.importBag(exported, { replace: true });
    const again = pd.bagToJSON();
    const res = await pd.importBag(exported);   // add to the same bag: every id clashes
    return { exported, again, res, ids: pd.bag.designs.map(d => d.id) };
  });
  expect(r.again).toEqual(r.exported);
  expect(r.res.added).toBe(2);
  expect(r.ids).toEqual(['amethyst', 'bone', 'amethyst-2', 'bone-2']);
});

test('a single design file loads as a bag of one named after the design', async ({ shared: app }) => {
  const r = await app.run(pd => pd.parseBag({ ...pd.designToJSON(), shape: 'd10', name: 'Old Bone' }));
  expect(r.bag.designs).toHaveLength(1);
  expect(r.bag.name).toBe('Old Bone');
  expect(r.bag.designs[0]).toMatchObject({ id: 'old-bone', name: 'Old Bone', preview_shape: 'd10' });
  expect(r.bag.active.design).toBe('old-bone');
});

test('invalid designs and dangling references are dropped and reported', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const ok = pd.designToJSON();
    return pd.parseBag({ format: 'pretty-dice-bag', version: 1, designs: [{ id: 'good', name: 'Good', design: ok }, { id: 'bad', name: 'Bad', design: { ...ok, shape: 'd99' } }],
      sets: [{ id: 's', name: 'S', terms: [{ count: 1, sides: 20, design: 'bad' }] }], active: { design: 'bad', set: 'nope' } });
  });
  expect(r.bag.designs.map(d => d.id)).toEqual(['good']);
  expect(r.bag.sets[0].terms[0].design).toBeUndefined();
  expect(r.bag.active).toEqual({ design: 'good', set: null, draft: false });
  expect(r.dropped.length).toBe(2);
  for (const bad of [null, { format: 'x' }, { format: 'pretty-dice-bag', version: 2 }, { format: 'pretty-dice-bag', version: 1, designs: [] }])
    await expect(app.run((pd, b) => { try { pd.parseBag(b); return 'ok'; } catch (e) { return e.message; } }, bad)).resolves.not.toBe('ok');
});
