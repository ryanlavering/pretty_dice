// PD-206 (4.2 S3): every game shows its own dice in the lobby, held in bag.hold (hold.mine = the player's own dice);
// Roll rolls them in place; release triggers; typed formula / set pick release first (I9); P4/P5/P6 regressions.
import { test, expect } from './helpers/app.mjs';

const dice = app => app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length }));
const hold = app => app.run(pd => { const h = pd.bag.hold; return h ? { game: h.game, phase: h.phase, mine: { ...h.mine } } : null; });
const pick = (app, id) => app.page.selectOption('#scorepane select >> nth=0', id);
const settle = app => app.run(pd => { pd.step(20); pd.renderOnce(); });
const toLobby = async (app, id) => { await app.nav.toPlay(); await app.run(pd => pd.openGames()); if (id) await pick(app, id); await settle(app); };
const paneNow = app => app.page.evaluate(() => document.querySelector('#paneltabs [aria-selected=true]')?.dataset.pane);
const OWN = { shape: 'custom', notation: '3d8+1' };
const setOwn = async (app, o = OWN) => { await app.run((pd, o) => { pd.state.shape = o.shape; pd.state.notation = o.notation; pd.buildDice(); }, o); };

test('#21: Yacht selected in the lobby shows 5d6 on the mat; the player\'s own dice are in hold.mine', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'yahtzee');
  expect(await dice(app)).toEqual({ shape: 'custom', notation: '5d6', n: 5 });
  expect(await hold(app)).toMatchObject({ game: 'yahtzee', phase: 'lobby', mine: OWN });
  expect(await paneNow(app)).toBe('games');
});

for (const [id, notation, n] of [['farkle', '6d6', 6], ['pig', '1d6', 1], ['craps', '2d6', 2], ['liarsdice', '5d6', 5]]) {
  test(`#21: ${id} shows ${notation} in the lobby${id === 'liarsdice' ? ' openly (E11)' : ''}; leaving gives mine back`, async ({ shared: app }) => {
    await app.reset(206, { plain: true }); await setOwn(app);
    await toLobby(app, id);
    expect(await dice(app)).toEqual({ shape: 'custom', notation, n });
    if (id === 'liarsdice') expect(await app.run(pd => pd.dice.every(d => d.mesh.visible))).toBe(true);
    await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
    expect(await dice(app)).toMatchObject(OWN);
    expect(await hold(app)).toBeNull();
  });
}

test('#22/#23/E10: options re-key the lobby; switching games re-keys one hold and keeps mine', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'yahtzee');
  await pick(app, 'craps'); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '2d6', n: 2 });
  expect(await hold(app)).toMatchObject({ game: 'craps', phase: 'lobby', mine: OWN });
  await pick(app, 'story'); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '5d12', n: 5 });
  expect(await hold(app)).toMatchObject({ game: 'story', mine: OWN });
  const dn = app.page.getByLabel('Dice', { exact: true });
  await dn.fill('7'); await dn.dispatchEvent('change'); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '7d12', n: 7 });
  await app.page.getByLabel('Faces per die').selectOption('20'); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '7d20', n: 7 });
  expect(await hold(app)).toMatchObject({ mine: OWN });
  await pick(app, 'pig'); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '1d6', n: 1 });
  expect(await app.run(pd => pd.state.substrate)).not.toBe('solid-story');   // the Story look went with the Story lobby
  expect(await hold(app)).toMatchObject({ game: 'pig', mine: OWN });
  await app.page.locator('#scorepane').getByRole('button', { name: 'Close' }).click(); await settle(app);
  expect(await dice(app)).toMatchObject(OWN);
  expect(await hold(app)).toBeNull();
});

test('#24: Roll, Enter, R in the Yacht lobby roll the lobby dice in place on the Games tab', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'yahtzee');
  await app.page.locator('#rollbox').fill('');   // a typed formula in the box is PD-192 B (#25); an empty box rolls the lobby dice
  for (const how of ['button', 'enter', 'key']) {
    if (how === 'button') await app.page.click('#rollbtn');
    if (how === 'enter') { await app.page.locator('#rollbox').focus(); await app.page.keyboard.press('Enter'); }
    if (how === 'key') { await app.page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {}); await app.page.keyboard.press('r'); }
    await app.run(pd => pd.simRoll({ rerolls: 6 }));
    expect(await dice(app), how).toEqual({ shape: 'custom', notation: '5d6', n: 5 });
    expect(await paneNow(app), how).toBe('games');
    expect(await hold(app), how).toMatchObject({ phase: 'lobby', mine: OWN });
  }
});

test('#25/I9: a typed formula in the lobby releases the hold, then rolls the typed dice on the Table', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'yahtzee');
  await app.page.locator('#rollbox').fill('2d8'); await app.page.keyboard.press('Enter');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  expect(await hold(app)).toBeNull();
  expect(await dice(app)).toMatchObject({ notation: '2d8', n: 2 });
  expect(await paneNow(app)).toBe('table');
  expect(await app.run(() => JSON.parse(localStorage.getItem('prettydice.v1')).notation)).toBe('2d8');
});

for (const leave of ['table', 'log', 'design', 'close', 'full']) {
  test(`#26: ${leave} releases the lobby hold and brings the player's dice back`, async ({ shared: app }) => {
    await app.reset(206, { plain: true }); await setOwn(app);
    await toLobby(app, 'pig');
    expect(await dice(app)).toMatchObject({ notation: '1d6' });
    if (leave === 'close') await app.page.locator('#scorepane').getByRole('button', { name: 'Close' }).click();
    else if (leave === 'design') await app.nav.toDesign();
    else if (leave === 'full') await app.nav.fullView(true);
    else await app.page.click(`#paneltabs [data-pane=${leave}]`);
    await settle(app);
    expect(await dice(app)).toMatchObject(OWN);
    expect(await hold(app)).toBeNull();
    if (leave === 'full') await app.nav.fullView(false);
  });
}

test('#12/I9: a set pick in the lobby releases the hold, then the set\'s dice are on the mat', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'yahtzee');
  const id = await app.run(pd => pd.setOps.create({ name: 'Lobby set', terms: [{ count: 4, sides: 10 }], mod: 0 }));
  await app.run((pd, id) => pd.setOps.open(id), id); await settle(app);
  expect(await hold(app)).toBeNull();
  expect(await dice(app)).toMatchObject({ notation: '4d10', n: 4 });
  expect(await paneNow(app)).toBe('table');
  await app.page.click('#paneltabs [data-pane=log]'); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '4d10' });   // nothing stale comes back
});

test('P4: a Bag pick in the Story lobby keeps the player\'s dice (release restores mine, the pick stays)', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await app.run(pd => pd.bagOps.addBlank()); await app.run(pd => { pd.state.shape = 'custom'; pd.state.notation = '3d8+1'; pd.buildDice(); });
  const ids = await app.run(pd => pd.bag.designs.map(d => d.id));
  await toLobby(app, 'story');
  await app.run((pd, id) => pd.bagActivate(id), ids[0]); await settle(app);
  expect(await dice(app)).toMatchObject({ notation: '5d12' });   // lobby dice stay while Games shows them
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  expect(await dice(app)).toMatchObject(OWN);
  expect(await app.run(pd => pd.bag.active.design)).toBe(ids[0]);
  expect(await app.run(() => JSON.parse(localStorage.getItem('prettydice.v1')).notation)).toBe(OWN.notation);
});

test('P4: Randomize in the Story lobby keeps the player\'s dice after release', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'story');
  await app.run(pd => pd.randomize()); await settle(app);
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  expect(await dice(app)).toMatchObject(OWN);
  expect(await hold(app)).toBeNull();
});

test('P5: a set pick in the Story lobby is not undone by stale dice when the lobby is left', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'story');
  const id = await app.run(pd => pd.setOps.create({ name: 'P5 set', terms: [{ count: 3, sides: 4 }], mod: 0 }));
  await app.run((pd, id) => pd.setOps.open(id), id); await settle(app);
  for (const t of ['log', 'table']) { await app.page.click(`#paneltabs [data-pane=${t}]`); await settle(app); expect(await dice(app)).toMatchObject({ notation: '3d4', n: 3 }); }
  expect(await app.run(pd => pd.bag.active.set)).toBe(id);
});

test('P6: reload mid-Yacht keeps the player\'s own dice (settings store holds mine, not the game\'s 5d6)', async ({ app }) => {
  await app.open({ seed: 82 }); await app.run(pd => { pd.pause(); pd.state.shape = 'custom'; pd.state.notation = '3d8+1'; pd.buildDice(); });
  await app.run(pd => pd.openGames()); await pick(app, 'yahtzee'); await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  expect(await app.run(pd => ({ g: !!pd.game, h: pd.bag.hold && pd.bag.hold.phase }))).toEqual({ g: true, h: 'game' });
  expect(await app.run(pd => pd.state.notation)).toBe('5d6');
  await app.page.reload(); await app.ready();
  expect(await app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation }))).toEqual({ shape: 'custom', notation: '3d8+1' });   // (a paused Yacht game keeps a hold when its pips draft exists, PD-188: the hold is not asserted)
  await app.run(pd => pd.openGames());
  await app.page.click('#scorepane button:has-text("Resume Yacht")');
  await app.page.click('#scorepane button:has-text("End game")');   // Games is still showing Yacht afterwards: its lobby again (#28), with mine kept in the hold
  expect(await hold(app)).toMatchObject({ phase: 'lobby', mine: { notation: '3d8+1' } });
  await app.page.click('#paneltabs [data-pane=table]');
  expect(await dice(app)).toMatchObject({ notation: '3d8+1' });
});

test('Start from the lobby keeps one hold with mine; End game restores mine', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await setOwn(app);
  await toLobby(app, 'yahtzee'); await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 }));
  expect(await hold(app)).toMatchObject({ phase: 'game', mine: OWN });
  await app.run(pd => pd.endGame()); await settle(app);
  expect(await dice(app)).toMatchObject(OWN);
  expect(await hold(app)).toBeNull();
});
