// PD-142.38.52: saving the bag first saves every edited / renamed design, so the file has the new names and nothing stays Modified.
import { readFile } from 'node:fs/promises';
import { test, expect } from './helpers/app.mjs';

const prep = async app => {
  await app.open();
  await app.run(async pd => { await pd.bagOps.addBlank(); await pd.bagOps.addBlank(); });
  return app.run(async pd => { const ids = pd.bag.designs.map(d => d.id); ids.forEach((id, i) => pd.bagOps.rename(id, 'Renamed ' + (i + 1))); return ids; });
};
for (const [name, btn] of [['Save bag link', '#bagsave'], ['Bag view Save button', '#sheetsave']]) {
  test(`${name}: renamed designs are saved into the file and nothing is left modified`, async ({ app, page }) => {
    const ids = await prep(app);
    expect(await app.run(pd => Object.keys(pd.bag.pending).length), 'renames are pending before the save').toBeGreaterThan(1);
    await app.nav.openBag();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(btn)]);
    const file = JSON.parse(await readFile(await dl.path(), 'utf8'));
    expect(file.designs.map(d => d.name)).toEqual(ids.map((_, i) => 'Renamed ' + (i + 1)));
    expect(file.designs.map(d => d.design.name)).toEqual(file.designs.map(d => d.name));
    await expect.poll(() => app.run(pd => Object.keys(pd.bag.pending).length)).toBe(0);
    expect(await app.run(pd => pd.bag.designs.map(d => d.name)), 'live bag has the names too').toEqual(file.designs.map(d => d.name));
    await expect(page.locator('#bagdirty')).toBeHidden();
  });
}
test('Copy JSON also commits first', async ({ app, page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await prep(app); await app.nav.openBag(); await page.click('#sheetcopy');
  await expect.poll(() => app.run(pd => Object.keys(pd.bag.pending).length)).toBe(0);
});
