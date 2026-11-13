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
