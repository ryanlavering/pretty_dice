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
    pd.bagOps.rename('amethyst', 'Purple'); out.renamed = { saved: pd.bag.designs[0].name, pending: pd.bag.pending.amethyst.name, mod: pd.isModified('amethyst') };
    await pd.bagOps.save('amethyst'); out.renamedSaved = { saved: pd.bag.designs[0].name, mod: pd.isModified('amethyst') };
    pd.bagOps.rename('amethyst', 'Purple'); pd.bagOps.rename('amethyst', 'Amethyst'); out.renameBack = pd.isModified('amethyst');
    pd.bagOps.rename('amethyst', 'Purple');
    pd.bagOps.move('gold', 0); out.moved = ids(); pd.bagOps.move('gold', 99); out.movedEnd = ids();
    out.deleteActive = await pd.bagOps.remove(pd.bag.active.design); out.afterDelete = { ids: ids(), active: pd.bag.active.design, notModified: !pd.isModified(pd.bag.active.design) };
    await pd.bagOps.remove('gold'); await pd.bagOps.remove('bone'); out.lastRefused = await pd.bagOps.remove(pd.bag.designs[0].id); out.left = ids();
    return out;
  });
  expect(r.dup).toEqual({ ids: ['amethyst', 'amethyst-copy', 'bone', 'gold'], active: 'amethyst-copy' });
  expect(r.renamed).toEqual({ saved: 'Amethyst', pending: 'Purple', mod: true });
  expect(r.renamedSaved).toEqual({ saved: 'Purple', mod: false }); expect(r.renameBack).toBe(true);
  expect(r.moved).toEqual(['gold', 'amethyst', 'amethyst-copy', 'bone']); expect(r.movedEnd).toEqual(['amethyst', 'amethyst-copy', 'bone', 'gold']);
  expect(r.deleteActive).toBe(true); expect(r.afterDelete.ids).toEqual(['amethyst', 'bone', 'gold']); expect(r.afterDelete.notModified).toBe(true);
  expect(r.lastRefused).toBe(false); expect(r.left).toHaveLength(1);
});

test('shelf and sheet show the bag; tapping a card picks it', async ({ app, page }) => {
  test.setTimeout(180_000); expect.configure({ timeout: 60_000 });   // the background picture pass is slow on software GL, especially with two workers
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

test('menu actions work on a modified design that is not active', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const out = {}; pd.state.radius = 0.1; pd.save(); await pd.bagActivate('gold');   // bone now has pending edits
    await pd.bagOps.revert('bone'); out.revert = { mod: pd.isModified('bone'), active: pd.bag.active.design };
    await pd.bagActivate('bone'); pd.state.radius = 0.1; pd.save(); await pd.bagActivate('gold');
    await pd.bagOps.save('bone'); out.save = { mod: pd.isModified('bone'), saved: pd.bag.designs.find(d => d.id === 'bone').design.edge_radius };
    await pd.bagActivate('bone'); pd.state.radius = 0.12; pd.save(); await pd.bagActivate('gold');
    await pd.bagOps.saveCopy('bone'); out.copy = { ids: pd.bag.designs.map(d => d.id), boneMod: pd.isModified('bone'), boneSaved: pd.bag.designs.find(d => d.id === 'bone').design.edge_radius, copySaved: pd.bag.designs.find(d => d.id === 'bone-copy').design.edge_radius, active: pd.bag.active.design };
    return out;
  });
  expect(r.revert).toEqual({ mod: false, active: 'gold' });
  expect(r.save).toEqual({ mod: false, saved: 0.1 });
  expect(r.copy).toEqual({ ids: ['amethyst', 'bone', 'bone-copy', 'gold'], boneMod: false, boneSaved: 0.1, copySaved: 0.12, active: 'gold' });
});

test('design pictures are a d20 whatever the preview shape, appear without reopening, and the live design is left alone', async ({ app, page }) => {
  test.setTimeout(180_000); expect.configure({ timeout: 60_000 });
  await app.open({ query: 'thumbs=1' });
  await app.run(SETUP);   // bone (d6, active), amethyst (d20), gold (d8)
  await expect.poll(() => page.locator('#cards .card[data-id] .th').evaluateAll(n => n.map(e => e.style.backgroundImage.startsWith('url("data:image'))), { timeout: 60000 }).toEqual([true, true, true]);
  await expect(page.locator('#bagth')).toHaveCSS('background-image', /data:image/);
  const r = await app.run(pd => ({ shape: pd.state.shape, active: pd.bag.active.design, mod: pd.isModified('bone'), n: Object.keys(pd.thumbs).length }));
  expect(r).toEqual({ shape: 'd6', active: 'bone', mod: false, n: 3 });
});

test('clicking a name on the shelf edits it in place and leaves it Modified until saved', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.locator('#cards .card[data-id="gold"] .nm').click();
  await page.locator('#cards .nmedit').fill('Lucky coin'); await page.keyboard.press('Enter');
  await expect(page.locator('#cards .card[data-id="gold"] .nm')).toHaveText('Lucky coin');
  await expect(page.locator('#cards .card[data-id="gold"] .dot')).toHaveCount(1);
  const r = await app.run(pd => ({ saved: pd.bag.designs[2].name, mod: pd.isModified('gold'), active: pd.bag.active.design }));
  expect(r).toEqual({ saved: 'Gold', mod: true, active: 'bone' });   // renaming does not switch designs
  await page.locator('#cards .card[data-id="gold"]').click();   // pick it: the settings row shows Modified, Save keeps the name
  await expect(page.locator('#modbadge')).toBeVisible(); await page.locator('#bsave').click();
  await expect.poll(() => app.run(pd => pd.bag.designs[2].name)).toBe('Lucky coin');
  await expect(page.locator('#modbadge')).toBeHidden();
});

test('a typed name is kept when you switch away and back, and shows Modified', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.locator('#dname').fill('Brand new name'); await page.keyboard.press('Enter');
  await expect(page.locator('#modbadge')).toBeVisible();
  await page.locator('#cards .card[data-id="gold"]').click(); await expect.poll(() => app.run(pd => pd.bag.active.design)).toBe('gold');
  await page.locator('#cards .card[data-id="bone"]').click(); await expect.poll(() => app.run(pd => pd.bag.active.design)).toBe('bone');
  await expect(page.locator('#dname')).toHaveValue('Brand new name');
  await expect(page.locator('#bagname')).toHaveText('Brand new name');
  await expect(page.locator('#bagbtn')).toBeVisible();
});

test('rotating the phone does not change the chosen design', async ({ app, page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await app.open();
  await app.run(SETUP);
  await page.locator('#cards .card[data-id="gold"]').click();
  await expect.poll(() => app.run(pd => pd.bag.active.design)).toBe('gold');
  for (const vp of [{ width: 780, height: 390 }, { width: 390, height: 780 }, { width: 780, height: 390 }]) {
    await page.setViewportSize(vp); await page.waitForTimeout(900);   // longer than the shelf's settle delay
    expect(await app.run(pd => pd.bag.active.design)).toBe('gold');
  }
  // what a rotation does to the strip: it moves under the active card without anyone touching it
  await page.evaluate(() => { document.getElementById('cards').scrollLeft = 0; }); await page.waitForTimeout(900);
  expect(await app.run(pd => pd.bag.active.design)).toBe('gold');
  // a real flick still picks the card that lands in the middle
  // the loop above ends in landscape, where all the cards fit and the strip cannot scroll; flick in portrait, away from 0 first (a scroll to the same spot fires no event)
  await page.setViewportSize({ width: 390, height: 780 }); await page.waitForTimeout(900);
  await page.locator('#cards').dispatchEvent('touchstart'); await page.evaluate(() => { document.getElementById('cards').scrollLeft = 1e5; });
  await page.waitForTimeout(900);
  await page.locator('#cards').dispatchEvent('touchstart'); await page.evaluate(() => { document.getElementById('cards').scrollLeft = 0; });
  await expect.poll(() => app.run(pd => pd.bag.active.design)).toBe('amethyst');
});

test('Load bag replaces the bag and asks first when it has unsaved changes; Save bag clears the badge (PD-108)', async ({ app, page }) => {
  await app.open();
  const mkFile = name => JSON.stringify({ format: 'pretty-dice-bag', version: 1, name, designs: [{ id: 'one', name: 'One', preview_shape: 'd8', design: { ...JSON.parse(JSON.stringify({})), format: 'pretty-dice', version: 1, shape: 'd8', substrate: 'metal' } }], sets: [], characters: [], jail: [], pending: {}, draft: null, active: { design: 'one', set: null, draft: false }, log: [] });
  await expect(page.locator('#bagdirty')).toBeHidden();
  await app.run(pd => pd.bagOps.addBlank());
  await expect(page.locator('#bagdirty')).toBeVisible();
  await expect(page.locator('#savebag')).toHaveClass(/dirty/);
  await expect(page.locator('#replacebag')).toHaveCount(0);
  // unsaved: Load bag asks; Cancel leaves everything alone
  await page.click('#loadbag'); await expect(page.locator('#bagask')).toBeVisible();
  await page.click('#baskCancel'); await expect(page.locator('#bagask')).toBeHidden();
  expect(await app.run(pd => pd.bag.designs.length)).toBe(2);
  // Save bag (from the link) clears the badge; a clean bag loads with no question and is replaced, not appended to
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bagsave')]);
  expect(dl.suggestedFilename()).toMatch(/\.bag\.json$/);
  await expect(page.locator('#bagdirty')).toBeHidden();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#loadbag')]);
  await expect(page.locator('#bagask')).toBeHidden();
  await fc.setFiles({ name: 'b.bag.json', mimeType: 'application/octet-stream', buffer: Buffer.from(mkFile('Loaded bag')) });
  await expect.poll(() => app.run(pd => pd.bag.designs.map(d => d.id))).toEqual(['one']);
  expect(await app.run(pd => pd.bag.name)).toBe('Loaded bag');
  await expect(page.locator('#bagdirty')).toBeHidden();   // what was just loaded is what the file holds
  // dirty again: Discard goes straight to the file picker
  await app.run(pd => pd.bagOps.addBlank()); await expect(page.locator('#bagdirty')).toBeVisible();
  await page.click('#loadbag');
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#baskDiscard')]);
  await fc2.setFiles({ name: 'c.bag.json', mimeType: 'application/octet-stream', buffer: Buffer.from(mkFile('Second')) });
  await expect.poll(() => app.run(pd => pd.bag.name)).toBe('Second');
  expect(await app.run(pd => pd.bag.designs.length)).toBe(1);
});

test('Save bag writes the current state of edited designs; the session keeps them pending, and a loaded file is clean (PD-112)', async ({ app, page }) => {
  test.setTimeout(120_000);
  await app.open();
  await app.run(SETUP);
  await app.run(async pd => { pd.state.radius = 0.11; pd.save(); await pd.bagActivate('gold'); pd.state.radius = 0.09; pd.save(); });   // bone and gold both carry edits
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#savebag')]);
  const file = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  expect(file.pending).toEqual({});
  expect(file.designs.find(d => d.id === 'gold').design.edge_radius).toBe(0.09);
  expect(file.designs.find(d => d.id === 'bone').design.edge_radius).toBe(0.11);
  // the session: bag counts as saved, but the designs are still Modified and revert to their old state
  await expect(page.locator('#bagdirty')).toBeHidden();
  const s = await app.run(async pd => { const was = { gold: pd.isModified('gold'), bone: pd.isModified('bone') }; await pd.bagOps.revert('gold'); return { was, radiusAfter: pd.state.radius, goldMod: pd.isModified('gold') }; });
  expect(s.was).toEqual({ gold: true, bone: true });
  expect(s.goldMod).toBe(false); expect(s.radiusAfter).not.toBe(0.09);
  // loading that file: the designs come in clean with the newer state
  await page.click('#loadbag');   // the revert above changed the bag, so it asks first
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#baskDiscard')]);
  await fc.setFiles({ name: 'x.bag.json', mimeType: 'application/octet-stream', buffer: Buffer.from(JSON.stringify(file)) });
  await expect.poll(() => app.run(pd => pd.bag.designs.find(d => d.id === 'bone').design.edge_radius)).toBe(0.11);
  const l = await app.run(pd => ({ pending: Object.keys(pd.bag.pending), goldMod: pd.isModified('gold'), boneMod: pd.isModified('bone'), goldR: pd.bag.designs.find(d => d.id === 'gold').design.edge_radius }));
  expect(l).toEqual({ pending: [], goldMod: false, boneMod: false, goldR: 0.09 });
});

test('Delete from the card menu confirms in the page (no browser dialog) and removes the design', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  page.on('dialog', d => d.dismiss());   // a browser confirm() is blocked in some embeds, so the app must not use one
  await page.locator('#cards .card[data-id="gold"]').click({ button: 'right' });
  await page.locator('#cardmenu button', { hasText: 'Delete…' }).click();
  await expect(page.locator('#cardmenu .mh')).toContainText('Delete "Gold"?');
  await page.locator('#cardmenu button', { hasText: /^Delete$/ }).click();
  expect(await app.run(pd => pd.bag.designs.map(d => d.id))).toEqual(['amethyst', 'bone']);
});

test('a new blank design is plain off-white solid plastic, not the swirl default', async ({ app }) => {
  await app.open();
  await app.run(SETUP);
  const r = await app.run(async pd => { const id = await pd.bagOps.addBlank(); const d = pd.bag.designs.find(x => x.id === id).design; return { sub: d.substrate, colors: d.colors }; });
  expect(r.sub).toBe('solid');
  expect(new Set(r.colors).size).toBe(1);
  expect(r.colors[0]).toBe('#efe9dc');
});

test('no design picture is taken while the camera eases back from the roll view (PD-110)', async ({ app, page }) => {
  test.setTimeout(300_000); expect.configure({ timeout: 120_000 });
  await app.open({ query: 'thumbs=1' });
  await app.run(SETUP);
  await expect.poll(() => app.run(pd => Object.keys(pd.thumbs).length), { timeout: 120_000 }).toBe(3);   // pictures taken at rest
  const first = await app.run(pd => Object.keys(pd.thumbs));
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '6d20'; pd.buildDice(); pd.startRoll(); await new Promise(r => setTimeout(r, 2500)); });   // six dice, like the reported card
  const r = await app.run(async pd => {   // the roll is over: back to the showcase, camera still on its way home
    pd.exitRoll(); pd.state.radius = 0.137; const eased = pd.camBlend, before = Object.keys(pd.thumbs).length;
    await pd.updateThumbs(); return { eased, tookOne: Object.keys(pd.thumbs).length > before };
  });
  expect(r.eased).toBeGreaterThan(0.01);   // the situation really is mid-ease
  expect(r.tookOne).toBe(false);           // so the picture waits instead of photographing the table and a tiny die
  await app.run(pd => { pd.camBlend = 0; });   // the camera arrives home (software GL eases it for tens of seconds)
  await expect.poll(() => app.run((pd, first) => Object.keys(pd.thumbs).some(k => !first.includes(k)), first), { timeout: 120_000 }).toBe(true);   // and the pass takes the picture for the new look
  const fill = await page.evaluate(async first => { const pd = window.__pd, k = Object.keys(pd.thumbs).find(x => !first.includes(x)); const im = new Image(); im.src = pd.thumbs[k]; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, bg = [d[0], d[1], d[2]]; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60) n++; return n / (c.width * c.height); }, first);
  expect(fill).toBeGreaterThan(0.1); expect(fill).toBeLessThan(0.6);   // one die in a dark frame, not a screen full of table
});

// Phase 3 (PD-102.3): a die per term can use another design in the bag.
test('a set mixes designs: @design notation, one look per design, rolls and reads correctly', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);   // bone is active; amethyst (swirl) and gold (metal) are other designs
  await page.locator('#shapes button[data-id="custom"]').click();
  await page.locator('#notation').fill('d6@nope'); await page.locator('#notapply').click();
  await expect(page.locator('#noterr')).toContainText('No design');
  await page.locator('#notation').fill('2d6@bone+1d8@gold+d20@amethyst+1'); await page.locator('#notapply').click();
  await expect(page.locator('#noterr')).toHaveText('');
  const r = await app.run(pd => ({ notation: pd.state.notation, dice: pd.dice.map(d => ({ name: d.name, other: !!d.look, metal: d.mat.metalness, sub: d.look && d.look.substrate })), roll: pd.simRoll() }));
  expect(r.notation).toBe('2d6@bone+1d8@gold+1d20@amethyst+1');
  expect(r.dice.map(d => d.name)).toEqual(['d6', 'd6', 'd8', 'd20']);
  expect(r.dice.map(d => d.other)).toEqual([false, false, true, true]);          // the live design needs no copy
  expect(r.dice[2].sub).toBe('metal'); expect(r.dice[3].sub).toBe('swirl');
  expect(r.dice[2].metal).toBeGreaterThan(0.5); expect(r.dice[0].metal).toBeLessThan(0.5);   // gold is metal, bone is plastic
  expect(r.roll.dice.length).toBe(4);
  await expect(page.locator('#result')).toContainText('1d8 (Gold)');
  await expect(page.locator('#termchips button')).toHaveCount(3);
  await page.locator('#termchips button', { hasText: 'Gold' }).click();   // a chip removes its term
  expect(await app.run(pd => pd.state.notation)).toBe('2d6@bone+1d20@amethyst+1');
});

test('a note that names a deleted design falls back to the live design instead of failing', async ({ app }) => {
  await app.open();
  await app.run(SETUP);
  const r = await app.run(async pd => { pd.state.notation = '2d6@gold+1'; pd.state.shape = 'custom'; await pd.bagOps.remove('gold'); pd.state.notation = '2d6@gold+1'; return pd.dice.length; });
  expect(r).toBeGreaterThan(0);
});

test('dice that look the same share one atlas and geometry; different designs or shapes do not (profiling, PD-102.3)', async ({ app }) => {
  await app.open();
  await app.run(SETUP);
  const r = await app.run(pd => {
    const uniq = k => new Set(pd.dice.map(d => d[k])).size, build = n => { pd.state.shape = 'custom'; pd.state.notation = n; pd.buildDice(); };
    build('12d20'); const same = { atlases: uniq('atlas'), geos: uniq('geo'), mats: uniq('mat'), dice: pd.dice.length };
    build('6d20+6d20@gold'); const two = { atlases: uniq('atlas'), dice: pd.dice.length };      // the same shape in two designs: two atlases (gold has its own look but the same number style, so it may share)
    build('6d20+6d8'); const shapes = uniq('atlas');
    return { same, two, shapes };
  });
  expect(r.same).toEqual({ atlases: 1, geos: 1, mats: 12, dice: 12 });   // a material per die: each die glows and dims by itself
  expect(r.two.dice).toBe(12); expect(r.two.atlases).toBeLessThanOrEqual(2);
  expect(r.shapes).toBe(2);
});
