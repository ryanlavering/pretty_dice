// PD-158: a running game fixes the dice SET (shape and count) but the design (look) may change: Bag pick, set pick, Randomize.
import { test, expect } from './helpers/app.mjs';

const VIEWS = { desktop: { width: 960, height: 600 }, phone: { width: 390, height: 780 } };
for (const [vname, vp] of Object.entries(VIEWS)) {
  const setup = async app => {
    await app.page.setViewportSize(vp); await app.open();
    await app.run(async pd => {   // a bag with a d20 design, a different-looking d6 design, a 2d20 set and a five-d6 set; then Yacht
      await pd.bagOps.addBlank(); const b = pd.bagToJSON(), base = pd.designToJSON();
      b.designs.push({ id: 'twenty', name: 'Twenty', preview_shape: 'd20', design: { ...base, shape: 'd20', notation: '1d20', name: 'Twenty' } });
      b.designs.push({ id: 'sixer', name: 'Sixer', preview_shape: 'd6', design: { ...base, shape: 'd6', notation: '1d6', name: 'Sixer', substrate: 'solid', colors: ['#cc2222', '#cc2222', '#cc2222'] } });
      await pd.importBag(b, { replace: true });
      pd.setOps.create({ name: 'Twenties', terms: [{ count: 2, sides: 20 }], mod: 0 }); pd.setOps.create({ name: 'Fivesix', terms: [{ count: 5, sides: 6 }], mod: 0 });
      await pd.startGame('yahtzee', ['P1'], {}, []); pd.pause(); pd.simRoll(); pd.renderOnce(); pd.toggleHold(0);
    });
  };
  const snap = app => app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length, colors: [...pd.state.colors], sub: pd.state.substrate,
    vals: pd.GAMES.status(pd.game.state).dice, held: pd.GAMES.status(pd.game.state).held, game: pd.game && pd.game.id, msg: document.getElementById('scorepane').textContent + document.getElementById('dockhint').textContent }));

  test(`PD-158 ${vname}: Bag pick of a same-shape design changes the look; dice, values and holds stay`, async ({ app }) => {
    await setup(app); const before = await snap(app);
    await app.nav.openBag(); await app.page.locator('#tiles .tile[data-id="sixer"]').click(); await app.page.waitForTimeout(1000);
    const after = await snap(app);
    expect(after.colors).not.toEqual(before.colors); expect(after.colors[0]).toBe('#cc2222');
    expect([after.shape, after.notation, after.n, after.game]).toEqual([before.shape, before.notation, before.n, before.game]);
    expect(after.vals).toEqual(before.vals); expect(after.held).toEqual(before.held);
    await app.run(pd => { pd.simRoll(); }); expect((await snap(app)).n).toBe(5);   // the game rolls on
    // the new look is persisted with the bag
    expect(await app.run(() => JSON.parse(localStorage.getItem('prettydice.bag.v1')).active.design)).toBe('sixer');
  });

  test(`PD-158 ${vname}: Bag pick of a different shape is refused with a message`, async ({ app }) => {
    await setup(app); const before = await snap(app);
    await app.nav.openBag(); await app.page.locator('#tiles .tile[data-id="twenty"]').click(); await app.page.waitForTimeout(800);
    const after = await snap(app);
    expect([after.shape, after.notation, after.n, after.colors]).toEqual([before.shape, before.notation, before.n, before.colors]);
    expect(after.msg).toContain('fixes the dice');
  });

  test(`PD-158 ${vname}: a set with the same dice applies; a set with other dice is refused`, async ({ app }) => {
    await setup(app); const before = await snap(app);
    expect(await app.run(pd => pd.setOps.open(pd.bag.sets.find(s => s.name === 'Twenties').id))).toBe(false);
    expect((await snap(app)).n).toBe(5);
    expect(await app.run(pd => pd.setOps.open(pd.bag.sets.find(s => s.name === 'Fivesix').id))).toBe(true);
    await app.page.waitForTimeout(500);
    const after = await snap(app); expect([after.n, after.game]).toEqual([5, 'yahtzee']); expect(after.vals).toEqual(before.vals);
  });

  test(`PD-158 ${vname}: Randomize in a game rerolls the look but keeps the dice`, async ({ app }) => {
    await setup(app); const before = await snap(app);
    await app.run(pd => { pd.state.randshape = true; });
    for (let i = 0; i < 4; i++) { await app.run(pd => pd.randomize()); await app.page.waitForTimeout(400); }
    const after = await snap(app);
    expect([after.shape, after.notation, after.n]).toEqual([before.shape, before.notation, before.n]);
    expect(after.colors).not.toEqual(before.colors);
    expect(after.vals).toEqual(before.vals);
  });
}
