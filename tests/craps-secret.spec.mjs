// PD-162: Craps is hidden in the UI unless ?multipoop is in the URL (kept for the browser session). Engine code stays in place.
import { test, expect } from './helpers/app.mjs';

const gameOptions = app => app.page.locator('#scorepane select >> nth=0 >> option').evaluateAll(os => os.map(o => o.value));

test('Craps is not offered without the secret code', async ({ app }) => {
  await app.open({ secret: false });
  await app.run(pd => pd.openGames());
  const ids = await gameOptions(app);
  expect(ids).toContain('yahtzee');
  expect(ids).not.toContain('craps');
});

test('?multipoop unlocks Craps, and it stays unlocked on reload without the code', async ({ app }) => {
  await app.open();
  await app.run(pd => pd.openGames());
  expect(await gameOptions(app)).toContain('craps');
  await app.page.goto('/index.html?libs=local&seed=1');
  await app.page.waitForFunction(() => window.__pd);
  await app.run(pd => pd.openGames());
  expect(await gameOptions(app)).toContain('craps');
});
