// PD-159: Craps betting window: a bot shooter places its bets, then waits for the humans' Ready before the dice go.
import { test, expect } from './helpers/app.mjs';

const VIEWS = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 780 } };
for (const [vname, vp] of Object.entries(VIEWS)) {
  test(`PD-159 ${vname}: a human bets while a bot is the shooter; the bot rolls only after Ready`, async ({ app }) => {
    await app.page.setViewportSize(vp); await app.open();
    await app.run(async pd => { await pd.startGame('craps', ['Me', 'Bot'], {}, [1]); pd.pause(); pd.game.state.shooter = 1; pd.botPump(); });
    await app.page.waitForTimeout(2500);   // longer than the bot's pace (900 ms): it has placed its bets but must not roll
    const w = await app.run(pd => ({ settled: pd.settled, bets: pd.game.state.bets.map(b => [b.player, b.kind]), rolls: pd.game.state.rolls }));
    expect(w.rolls).toBe(0); expect(w.bets.some(([p, k]) => p === 1 && k === 'pass'), 'the bot bet the pass line').toBe(true);
    await expect(app.page.locator('#dockact button[data-act=ready]')).toBeVisible();
    await expect(app.page.locator('#dockhint')).toContainText('bets');
    // the human places a bet during the bot's turn
    if (await app.page.locator('#scorepane .ctab').count() === 0) await app.page.click('text=Scorecard');
    await app.page.locator('#scorepane .spot button.sp', { hasText: 'Field' }).click();
    expect(await app.run(pd => pd.game.state.bets.some(b => b.player === 0 && b.kind === 'field'))).toBe(true);
    // no roll yet; Ready lets the bot shoot
    expect(await app.run(pd => pd.game.state.rolls)).toBe(0);
    await app.page.locator('#dockact button[data-act=ready]').click();
    await expect.poll(() => app.run(pd => !pd.settled || pd.game.state.rolls > 0), { timeout: 8000 }).toBe(true);
    await expect(app.page.locator('#dockact button[data-act=ready]')).toHaveCount(0);
  });
}

test('PD-159: with only bots there is no Ready step (the table plays itself)', async ({ app }) => {
  await app.open();
  const hold = await app.run(async pd => { await pd.startGame('craps', ['A', 'B'], {}, [0, 1]); pd.pause(); pd.botPump(); return document.querySelectorAll('#dockact button[data-act=ready]').length; });
  expect(hold).toBe(0);
});
