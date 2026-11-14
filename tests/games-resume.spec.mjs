// A game in progress survives a reload and resumes from the Games panel (PD-142 save/resume).
import { test, expect } from './helpers/app.mjs';

test('a game in progress resumes after a reload; ending the game clears the save', async ({ shared: app }) => {
  await app.reset(81); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'pig');
  await app.page.click('#gamepanel button.big');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const before = await app.run(pd => JSON.stringify(pd.game.state));
  await app.page.reload();
  await app.page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60000 });
  await app.run(pd => pd.openGames());
  await app.page.click('#gamepanel button:has-text("Resume Pig")');
  expect(await app.run(pd => JSON.stringify(pd.game.state))).toBe(before);
  await app.page.click('#gamepanel button:has-text("End game")');
  await app.run(pd => pd.openGames());
  await expect(app.page.locator('#gamepanel button:has-text("Resume")')).toHaveCount(0);
});
