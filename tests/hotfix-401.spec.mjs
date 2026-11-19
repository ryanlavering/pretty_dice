// 4.0.1 hotfix specs: PD-157 (bot and a leaning die), PD-154 (design swap mid-game), PD-155 (bumped die re-read).
import { test, expect } from './helpers/app.mjs';

// A bot's roll leaves a die leaning: the bot applies the "Fix leaning dice" action itself and the turn goes on (PD-157).
for (const [id, opts] of [['yahtzee', {}], ['farkle', { opening: 0, target: 10000 }]]) {
  test(`${id}: a bot's roll with a leaning die is re-rolled by the bot, not stuck (PD-157)`, async ({ app }) => {
    await app.open({ query: 'botms=600000' });
    await app.run(pd => pd.pause());
    let found = false;
    for (let seed = 1; seed < 4 && !found; seed++) {   // find a roll that settles with a leaning die on a bot's turn
      found = await app.run(async (pd, [id, opts, seed]) => {
        if (pd.game) pd.endGame(); await pd.startGame(id, ['Bot'], opts, [0]); pd.reseed(seed);
        pd.simRoll({ maxSteps: 1 });   // the bot's throw has just started
        const [a, c] = pd.bodies;   // pin one die propped on another (static, raised, within reach): a lean that does not clear by itself
        for (const b of [a, c]) { b.type = 2; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); }
        c.position.set(0, pd.TABLE_Y + 0.6, 0); a.position.set(0.3, pd.TABLE_Y + 2, 0);
        pd.step(1500);   // the roll settles with that die leaning
        return pd.settled && pd.leans.some(Boolean);
      }, [id, opts, seed]);
      if (!found) await app.run(pd => pd.endGame());
    }
    expect(found, 'a game with a persistent leaning die').toBe(true);
    const before = await app.run(pd => JSON.stringify(pd.game.state));
    await app.run(pd => pd.resume());   // the live loop runs from here
    await expect.poll(() => app.run(pd => pd.bodies[0].position.y > pd.TABLE_Y + 3), { timeout: 15_000, message: 'the bot re-rolled (dropped in) the leaning die' }).toBe(true);   // stuck before the fix: the die stays where it was propped
    await app.run(pd => { for (const b of pd.bodies.slice(0, 2)) { b.type = 1; b.wakeUp(); } });   // the test pinned it in place; let the re-rolled die fall and settle
    await expect.poll(() => app.run(pd => JSON.stringify(pd.game.state)), { timeout: 30_000 }).not.toBe(before);   // the leaning die was re-rolled and the roll read
  });
}
