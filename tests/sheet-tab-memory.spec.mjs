// PD-213: the Bag reopens on the tab (Designs or Sets) last used, per device, across reloads; the bag file is unchanged.
import { test, expect } from './helpers/app.mjs';

const tab = app => app.run(() => document.querySelector('#sheettabs button.on').dataset.tab);
const open = async app => { await app.run(() => document.getElementById('bagbtn').click()); await app.page.waitForTimeout(200); };
const close = async app => { await app.run(() => document.getElementById('sheetclose').click()); await app.page.waitForTimeout(100); };
const go = (app, t) => app.page.locator(`#sheettabs [data-tab="${t}"]`).click();

test('the Bag reopens on the last used tab, survives a reload, and switching back sticks', async ({ app }) => {
  await app.open({ seed: 213 });
  await open(app); expect(await tab(app)).toBe('designs');
  await go(app, 'sets'); await close(app);
  await open(app); expect(await tab(app)).toBe('sets'); await close(app);
  await app.page.reload(); await app.ready();
  await open(app); expect(await tab(app)).toBe('sets');
  await go(app, 'designs'); await close(app);
  await open(app); expect(await tab(app)).toBe('designs'); await close(app);
  await app.page.reload(); await app.ready();
  await open(app); expect(await tab(app)).toBe('designs');
});

test('the remembered tab is not part of the bag file', async ({ app }) => {
  await app.open({ seed: 214 });
  await open(app); await go(app, 'sets');
  expect(await app.run(pd => JSON.stringify(pd.bagFileJSON()))).not.toMatch(/sheet/i);
});
