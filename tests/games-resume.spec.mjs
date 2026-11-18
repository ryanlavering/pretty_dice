// A game in progress survives a reload and resumes from the Games panel (PD-142 save/resume).
import { test, expect } from './helpers/app.mjs';

test('a game in progress resumes after a reload; ending the game clears the save', async ({ app }) => {
  await app.open({ seed: 81 }); await app.run(pd => { pd.pause(); pd.openGames(); });   // its own page: it reloads, which must not happen to the shared worker page (4.1 baseline)
  await app.page.selectOption('#scorepane select >> nth=0', 'pig');
  await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const before = await app.run(pd => JSON.stringify(pd.game.state));
  await app.page.reload(); await app.ready();
  await app.run(pd => pd.openGames());
  await app.page.click('#scorepane button:has-text("Resume Pig")');
  expect(await app.run(pd => JSON.stringify(pd.game.state))).toBe(before);
  await app.page.click('#scorepane button:has-text("End game")');
  await app.run(pd => pd.openGames());
  await expect(app.page.locator('#scorepane button:has-text("Resume")')).toHaveCount(0);
});
