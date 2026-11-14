// PD-142.6 UI: Farkle and Pig panels drive the pd-games engine from real dice.
import { test, expect } from './helpers/app.mjs';

test('pig: roll adds to the turn total, bank passes the turn', async ({ shared: app }) => {
  await app.reset(51); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'pig');
  await app.page.click('#gamepanel button.big');
  expect(await app.run(pd => pd.state.notation)).toBe('1d6');
  await app.run(pd => pd.simRoll({rerolls:6}));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(st.dice[0]).toBeGreaterThanOrEqual(1);
  if (st.dice[0] === 1) { expect(st.player).toBe(0); expect(st.turnTotal).toBe(0); }   // 1 busts; one player keeps the turn
  else { expect(st.turnTotal).toBe(st.dice[0]); await app.page.click('#gamepanel button:has-text("Bank")'); expect(await app.run(pd => pd.GAMES.status(pd.game.state).scores[0])).toBe(st.dice[0]); }
  await app.run(pd => pd.endGame());
});

test('farkle: tap dice to set aside, roll the rest, bank', async ({ shared: app }) => {
  await app.reset(52); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'farkle');
  await app.page.click('#gamepanel button.big');
  expect(await app.run(pd => pd.state.notation)).toBe('6d6');
  await app.run(pd => pd.simRoll({rerolls:6}));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  if (st.phase === 'score') {
    const sug = await app.run(pd => pd.GAMES.suggest(pd.game.state));
    await app.page.click('#gamepanel .sugs button.best');
    const a = await app.run(pd => ({ st: pd.GAMES.status(pd.game.state), held: pd.held }));
    expect(a.st.turnTotal).toBe(sug[0].points);
    expect(a.held).toEqual(sug[0].slots);
  } else expect(st.turnTotal).toBe(0);   // busted
  await app.run(pd => pd.endGame());
});

test('craps: place a pass line bet from the panel, roll, bankroll moves; cash out closes the table', async ({ shared: app }) => {
  await app.reset(53); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'craps');
  await app.page.click('#gamepanel button.big');
  expect(await app.run(pd => pd.state.notation)).toBe('2d6');
  await app.page.click('#gamepanel button:has-text("Pass line")');
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bankrolls[0])).toBe(495);
  await app.page.click('#gamepanel .bet');   // the pass line bet cannot be taken down: the engine's error is shown, bet stays
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bets.length)).toBe(1);
  await app.run(pd => pd.simRoll({rerolls:6}));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(st.rollsUsed).toBe(1);
  await app.page.click('#gamepanel button:has-text("Cash out")');
  const end = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(end.phase).toBe('over'); expect(end.bets.length).toBe(0);
  await app.run(pd => pd.endGame());
});

async function start(app, id, seed) {
  await app.reset(seed); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', id);
  await app.page.click('#gamepanel button.big');
}

test('shut the box: roll, pick tiles from the panel, tiles shut', async ({ shared: app }) => {
  await start(app, 'shutbox', 61);
  expect(await app.run(pd => pd.state.notation)).toBe('2d6');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(st.phase === 'score' || st.phase === 'over').toBe(true);
  if (st.phase === 'score') {
    const sug = await app.run(pd => pd.GAMES.suggest(pd.game.state));
    await app.page.click('#gamepanel .sugs button.best');
    const a = await app.run(pd => pd.GAMES.status(pd.game.state));
    for (const t of sug[0].tiles) expect(a.tiles[t - 1]).toBe(false);
    // the tile buttons mirror the engine
    expect(await app.page.locator('#gamepanel .tile.shut').count()).toBe(sug[0].tiles.length);
  }
  await app.run(pd => pd.endGame());
});

test('ship captain and crew: locks show as held, panel shows cargo and bank', async ({ shared: app }) => {
  await start(app, 'shipcaptain', 62);
  expect(await app.run(pd => pd.state.notation)).toBe('5d6');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const st = await app.run(pd => ({ s: pd.GAMES.status(pd.game.state), held: pd.held }));
  expect(st.s.rollsUsed).toBe(1);
  expect(st.held).toEqual(st.s.held.map((h, i) => h ? i : -1).filter(i => i >= 0));
  expect(await app.page.locator('#gamepanel .gstat small').textContent()).toContain('roll 1 of 3');
  await app.run(pd => pd.endGame());
});

test('bunco: the round target shows and a roll is scored from the dice', async ({ shared: app }) => {
  await start(app, 'bunco', 63);
  expect(await app.run(pd => pd.state.notation)).toBe('3d6');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(st.dice.length).toBe(3);
  expect(await app.page.locator('#gamepanel .gstat').textContent()).toMatch(/Round [12] of 6/);
  await app.run(pd => pd.endGame());
});

test('farkle: banking passes the turn with holds and rings cleared (turn handoff)', async ({ shared: app }) => {
  await app.reset(81);
  let tries = 0, st;
  do {   // find a roll that scores, so there is something to set aside and bank
    await app.run(async (pd, seed) => { if (pd.game) pd.endGame(); await pd.startGame('farkle', ['A', 'B'], { opening: 0, target: 10000 }); pd.reseed(seed); pd.simRoll({ rerolls: 6 }); }, 100 + tries);
    st = await app.run(pd => pd.GAMES.status(pd.game.state));
  } while (st.phase !== 'score' && ++tries < 12);
  expect(st.phase).toBe('score');
  await app.page.click('#gamepanel .sugs button.best');
  const mid = await app.run(pd => ({ s: pd.GAMES.status(pd.game.state), held: pd.held }));
  expect(mid.held.length).toBeGreaterThan(0);
  await app.page.click('#gamepanel button:has-text("Bank")');
  const end = await app.run(pd => ({ s: pd.GAMES.status(pd.game.state), held: pd.held, rings: pd.holdRings }));
  expect(end.s.player).toBe(1); expect(end.s.turnTotal).toBe(0); expect(end.s.held.some(Boolean)).toBe(false);
  expect(end.held).toEqual([]); expect(end.rings).toBe(0);
  await app.run(pd => pd.endGame());
});

test('craps: no betting while the dice are rolling; bets open again once the roll is reported', async ({ shared: app }) => {
  await app.reset(54); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'craps');
  await app.page.click('#gamepanel button.big');
  await app.page.click('#gamepanel button:has-text("Pass line")');
  await expect(app.page.locator('#gamepanel button:has-text("Field")')).toBeEnabled();
  await app.page.click('#gamepanel button.big');   // start the roll (dice in the air)
  expect(await app.run(pd => pd.rolling && !pd.settled)).toBe(true);
  await expect(app.page.locator('#gamepanel button:has-text("Field")')).toBeDisabled();
  await expect(app.page.locator('#gamepanel button:has-text("Cash out")')).toBeDisabled();
  await expect(app.page.locator('#gamepanel input[type=number]')).toBeDisabled();
  expect(await app.run(() => document.querySelectorAll('#gamepanel .sugs button:not(:disabled)').length), 'every bet button is locked').toBe(0);
  const before = await app.run(pd => pd.GAMES.status(pd.game.state).bets.length);
  await app.run(pd => { pd.simRoll({ rerolls: 6 }); });
  await expect(app.page.locator('#gamepanel button:has-text("Field")')).toBeEnabled();
  expect(before).toBe(1);
  await app.run(pd => pd.endGame());
});

test('craps: grouped bets (hardway, horn), engine roll lock via rollStart, come bet after a point (PD-142.32 UI)', async ({ shared: app }) => {
  await app.reset(56); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'craps');
  await app.page.click('#gamepanel button.big');
  const bets = () => app.run(pd => pd.GAMES.status(pd.game.state).bets);
  await app.page.click('#gamepanel summary:has-text("Numbers")');
  await app.page.click('#gamepanel button:has-text("Hard 6")');
  expect((await bets()).map(b => [b.kind, b.number, b.amount])).toEqual([['hardway', 6, 5]]);   // off on the come-out, still accepted
  await app.page.click('#gamepanel summary:has-text("One roll")');
  await app.page.click('#gamepanel button:has-text("Horn")');
  expect((await bets()).find(b => b.kind === 'horn').amount).toBe(8);   // 5 rounded up to a multiple of 4
  // roll lock comes from the engine too
  await app.page.click('#gamepanel button.big');
  const mid = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(mid.rolling).toBe(true); expect(mid.canBet).toBe(false);
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const end = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(end.rolling).toBe(false); expect(end.canBet).toBe(true); expect(end.rollsUsed).toBe(1);
  // the Come group only offers come bets once there is a point
  const come = await app.run(pd => ({ stage: pd.GAMES.status(pd.game.state).stage, rows: pd.GAMES.suggest(pd.game.state).filter(r => r.kind === 'come').map(r => r.available) }));
  expect(come.rows[0]).toBe(come.stage === 'point');
  await app.run(pd => pd.endGame());
});
