// PD-142.30: on phones the scorecard lives in the settings slot ([Settings | Scorecard] tabs); the mat keeps a one-line status + Roll strip.
import { test, expect } from './helpers/app.mjs';

const phone = async (app, w, h) => { await app.page.setViewportSize({ width: w, height: h }); await app.page.waitForTimeout(150); };

for (const [w, h] of [[360, 640], [390, 844]]) {
  test(`phone ${w}x${h}: scorecard tab in the settings slot, thin strip on the mat, dice stay uncovered`, async ({ shared: app }) => {
    await app.reset(91); await phone(app, w, h);
    await app.page.click('#gamesbtn');
    await expect(app.page.locator('#paneltabs')).toBeVisible();
    await expect(app.page.locator('#scorepane')).toBeVisible();
    await expect(app.page.locator('#settingspane')).toBeHidden();
    await expect(app.page.locator('#gamestab')).toHaveText('Games');   // setup
    await expect(app.page.locator('#gamepanel')).toBeHidden();          // nothing floats over the mat during setup
    await app.page.click('#scorepane button.big');                      // Start game
    await expect(app.page.locator('#gamestab')).toHaveText('Scorecard');
    await expect(app.page.locator('#gamestab')).toHaveAttribute('aria-selected', 'true');
    const strip = await app.page.locator('#gamepanel.strip').boundingBox();
    expect(strip.height, 'strip is about one row').toBeLessThanOrEqual(60);
    await app.run(pd => pd.simRoll({ rerolls: 6 }));
    // the strip does not sit on the dice
    const hit = await app.run(pd => { const r = document.getElementById('gamepanel').getBoundingClientRect(); return pd.dice.map((_, i) => pd.bodyScreen(i)).filter(q => q.x >= r.left && q.x <= r.right && q.y >= r.top && q.y <= r.bottom).length; });
    expect(hit, 'dice under the strip').toBe(0);
    // roll from the strip, score from the pane
    await expect(app.page.locator('#gamepanel.strip button.big')).toBeEnabled();
    await expect(app.page.locator('#scorepane table')).toBeVisible();
    await app.page.click('#scorepane td.pick');
    expect(await app.run(pd => pd.GAMES.status(pd.game.state).rollsUsed)).toBe(0);
    // Settings tab shows the settings again; the game keeps running
    await app.page.click('#paneltabs button[data-pane=settings]');
    await expect(app.page.locator('#settingspane')).toBeVisible();
    await expect(app.page.locator('#scorepane')).toBeHidden();
    expect(await app.run(pd => !!pd.game)).toBe(true);
    await app.page.click('#paneltabs button[data-pane=games]');
    await app.page.click('#scorepane button:has-text("End game")');
    await expect(app.page.locator('#paneltabs')).toBeHidden(); await expect(app.page.locator('#gamepanel')).toBeHidden(); await expect(app.page.locator('#settingspane')).toBeVisible();
    await app.page.setViewportSize({ width: 1280, height: 720 });
  });
}

test('desktop keeps the side panel and no tab strip', async ({ shared: app }) => {
  await app.reset(92); await app.page.setViewportSize({ width: 1280, height: 720 });
  await app.page.click('#gamesbtn');
  await expect(app.page.locator('#gamepanel')).toBeVisible(); await expect(app.page.locator('#paneltabs')).toBeHidden(); await expect(app.page.locator('#scorepane')).toBeHidden();
  await app.page.click('#gamepanel button.big');
  await expect(app.page.locator('#gamepanel .gh h2')).toHaveText('Yahtzee');
  await app.run(pd => pd.endGame());
});
