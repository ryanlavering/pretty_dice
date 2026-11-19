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

// PD-154: a design (or set) swap while a game runs may only change the look. The game keeps its dice (shape and count) and plays on.
const VIEWS = { desktop: { width: 960, height: 600 }, phone: { width: 390, height: 780 } };
for (const [vname, vp] of Object.entries(VIEWS)) {
  const setup = async app => {
    await app.page.setViewportSize(vp); await app.open();
    await app.run(async pd => {   // a bag with a d20 design and a 2d20 set, then Yacht with its five d6
      await pd.bagOps.addBlank(); const b = pd.bagToJSON(); b.designs.push({ id: 'twenty', name: 'Twenty', preview_shape: 'd20', design: { ...pd.designToJSON(), shape: 'd20', notation: '1d20', name: 'Twenty' } });
      await pd.importBag(b, { replace: true }); pd.setOps.create({ name: 'Twenties', terms: [{ count: 2, sides: 20 }], mod: 0 });
      await pd.startGame('yahtzee', ['P1'], {}, []); pd.pause(); pd.simRoll(); pd.renderOnce();
    });
  };
  const dice = app => app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length, sides: pd.dice.map(d => d.name), rolling: pd.rolling, game: pd.game && pd.game.id }));
  const playsOn = async app => {   // the next roll is a normal five-d6 Yacht roll that the engine reads
    await app.run(pd => { pd.simRoll(); }); const r = await app.run(pd => ({ vals: pd.GAMES.status(pd.game.state).dice, n: pd.dice.length, rolls: pd.GAMES.status(pd.game.state).rollsUsed }));
    expect(r.n).toBe(5); expect(r.vals).toHaveLength(5); expect(r.vals.every(v => v >= 1 && v <= 6)).toBe(true);
  };

  test(`PD-154 ${vname}: choosing a design in the Bag during a game keeps the game's dice`, async ({ app }) => {
    await setup(app); const before = await dice(app);
    await app.nav.openBag(); await app.page.locator('#tiles .tile[data-id="twenty"]').click(); await app.page.waitForTimeout(800);
    expect(await dice(app)).toEqual(before); await playsOn(app);
  });

  test(`PD-154 ${vname}: opening a set during a game keeps the game's dice`, async ({ app }) => {
    await setup(app); const before = await dice(app), id = await app.run(pd => pd.bag.sets[0].id);
    await app.run(pd => pd.setOps.open(pd.bag.sets[0].id)); await app.page.waitForTimeout(800);
    expect(await dice(app)).toEqual(before); await playsOn(app);
  });

  test(`PD-154 ${vname}: the long-press design swap on one die is look-only; holds and the game carry on`, async ({ app }) => {
    await setup(app); const before = await dice(app);
    await app.run(pd => pd.toggleHold(0));
    const pt = await app.run(pd => pd.dieScreen(1)); const page = app.page;
    await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.waitForTimeout(650); await expect(page.locator('#cardmenu')).toBeVisible(); await page.mouse.up();
    await page.locator('#cardmenu button', { hasText: 'Twenty' }).click(); await page.waitForTimeout(500);
    const after = await dice(app); expect(after.n).toBe(5); expect(after.sides).toEqual(before.sides); expect(after.game).toBe('yahtzee');
    expect(await app.run(pd => pd.dice.map(d => d.design || null))).toEqual([null, 'twenty', null, null, null]);
    expect(await app.run(pd => pd.GAMES.status(pd.game.state).held), 'the game still holds die 1').toEqual([true, false, false, false, false]);
    await playsOn(app);
  });
}
