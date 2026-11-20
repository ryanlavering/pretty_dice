// PD-192 (4.1): Story Dice rating scale 0/3/5/7/10 as five buttons, copy, end screen, End game confirmation, eye hint.
import { test, expect } from './helpers/app.mjs';

const OPT = { dice: 3, sides: 12, rounds: 2, hints: true, packs: ['noto'], seed: 5 };
const start = async (app, { vp = { width: 1280, height: 800 }, players = ['Me'], bots = [], options = {}, resume = null, rate = true } = {}) => {
  await app.reset(91, { plain: true }); await app.page.setViewportSize(vp); await app.page.waitForTimeout(300);
  await app.run(pd => { if (pd.game) pd.endGame(); }); await app.page.waitForTimeout(300);
  await app.run(pd => { pd.openGames(); });
  await app.run((pd, a) => pd.startGame('story', a.players, a.options, a.bots, a.resume), { players, bots, options: { ...OPT, ...options }, resume });
  await app.run(pd => pd.simRoll({ rerolls: 6 })); await app.page.waitForTimeout(500);
};
const place = async app => { for (const i of [0, 1, 2]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click(); await app.page.waitForTimeout(300); };
const st = app => app.run(pd => { const s = pd.GAMES.status(pd.game.state); return { phase: s.phase, scores: s.scores, round: s.round }; });

test('story rating: five panel buttons score 0/3/5/7/10, the scale is written once, solo copy has no bot talk (PD-192)', async ({ shared: app }) => {
  await start(app, { options: { rounds: 5 } }); await place(app);
  const pane = app.page.locator('#scorepane');
  await expect(pane.locator('.story-scale')).toHaveText('Rate the story: Bad 0 · Weak 3 · Fair 5 · Good 7 · Great 10');
  await expect(pane).not.toContainText("bot's version"); await expect(pane).toContainText('Tell it, then rate your own story');
  await expect(app.page.locator('#dockhint')).toHaveText('Tell it, then rate your own story');
  await expect(pane.locator('.story-rate button')).toHaveText(['Bad0', 'Weak3', 'Fair5', 'Good7', 'Great10']);
  const rw = await pane.locator('.reword').boundingBox(); expect(rw.height).toBeLessThan(44);   // 'Re-word' stays on one line
  expect(await pane.locator('.reword').evaluate(e => getComputedStyle(e).whiteSpace)).toBe('nowrap');
  const want = [0, 3, 8, 15, 25], ids = ['bad', 'weak', 'fair', 'good', 'great'];
  for (let k = 0; k < 5; k++) {
    if (k) { await app.run(pd => pd.simRoll({ rerolls: 6 })); await place(app); }
    await (k % 2 ? app.page.locator(`#qbar [data-act=rate-${ids[k]}]`) : pane.locator(`.story-rate [data-rate=${ids[k]}]`)).click();   // panel and dock buttons both rate
    expect((await st(app)).scores).toEqual([want[k]]);
  }
  expect((await st(app)).phase).toBe('over');
});

test('story rating: a game saved with the old 0/1/2 scale loads with its totals and rates on the new scale (PD-192)', async ({ shared: app }) => {
  const old = await app.run((pd, o) => { const s = pd.GAMES.newGame('story', { players: ['Me'], options: o }); s.scores = [3]; s.tellings = [[{ rating: 'fair', points: 1, faces: [1, 2, 3], order: [0, 1, 2] }, { rating: 'good', points: 2, faces: [1, 2, 3], order: [0, 1, 2] }]]; s.turn = { player: 0, round: 3, faces: null, order: null }; return s; }, { ...OPT, rounds: 3 });
  await start(app, { resume: old }); await place(app);
  expect((await st(app)).scores).toEqual([3]); await expect(app.page.locator('#scorepane tr.tot')).toContainText('3');
  await expect(app.page.locator('#scorepane tbody')).toContainText('1 fair');
  await app.page.locator('#scorepane .story-rate [data-rate=fair]').click();
  expect((await st(app)).scores).toEqual([8]); await expect(app.page.locator('#scorepane tbody')).toContainText('5 fair');
});

for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) for (const full of [false, true]) test(`story rating: buttons >= 44 px, dock inside the screen and clear of the dice, ${vp.width}x${vp.height}${full ? ' full view' : ''} (PD-192)`, async ({ shared: app }) => {
  await start(app, { vp, players: ['Ann', 'Ben'], options: { dice: 5 } });
  if (full) await app.run(pd => pd.setFull(true));
  for (const i of [0, 1, 2, 3, 4]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await app.run(pd => { for (let i = 0; i < 90; i++) pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(700);
  const g = await app.page.evaluate(() => {
    const r = e => e.getBoundingClientRect(), q = r(document.querySelector('#qbar')), bs = [...document.querySelectorAll('#qbar [data-rate]')].map(r), tiles = [...document.querySelectorAll('#storytray .stile')].map(r), sent = document.querySelector('#storytray .ssent');
    const ps = [...document.querySelectorAll('#scorepane .story-rate button')].filter(b => b.offsetParent).map(r);
    return { n: bs.length, minW: Math.min(...bs.map(b => b.width)), minH: Math.min(...bs.map(b => b.height)), within: bs.every(b => b.left >= q.left - 1 && b.right <= q.right + 1 && b.top >= q.top - 1 && b.bottom <= q.bottom + 1), inScreen: q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight, dockTop: q.top, dockH: q.height, tilesBottom: Math.max(...tiles.map(t => t.bottom)), sentBottom: sent && !sent.hidden ? r(sent).bottom : 0, panelMin: ps.length ? Math.min(...ps.map(b => Math.min(b.width, b.height))) : 99 };
  });
  expect(g.n).toBe(5); expect(g.minW).toBeGreaterThanOrEqual(44); expect(g.minH).toBeGreaterThanOrEqual(44); expect(g.within).toBe(true); expect(g.inScreen).toBe(true); expect(g.panelMin).toBeGreaterThanOrEqual(44);
  expect(g.tilesBottom, 'dice end above the dock').toBeLessThanOrEqual(g.dockTop + 1); expect(g.sentBottom, 'sentence ends above the dock').toBeLessThanOrEqual(g.dockTop + 1);
  expect(g.dockH, 'dock growth stays small').toBeLessThanOrEqual(110);
  for (const id of ['bad', 'great']) { await app.page.locator(`#qbar [data-rate=${id}]`).click(); await app.run(pd => pd.simRoll({ rerolls: 6 })); for (const i of [0, 1, 2, 3, 4]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click().catch(() => {}); }
  await app.run(pd => pd.endGame()); await app.page.waitForTimeout(400);
  if (full) await app.run(pd => pd.setFull(false));
  const after = await app.page.locator('#qbar').boundingBox(); expect(after.height, 'dock returns to its normal one-row height (48 px)').toBeLessThanOrEqual(52); await expect(app.page.locator('#qbar')).not.toHaveClass(/storyq|rating/);
});

test('story rating: who judges, one voice in status line, panel and dock; no Re-word on a bot story (PD-192)', async ({ shared: app }) => {
  await start(app, { players: ['Ann', 'Ben'] }); await place(app);
  for (const t of [await app.page.locator('#dockhint').textContent(), await app.page.locator('#scorepane .gstat').first().textContent()]) expect(t).toContain('Everyone else judges');
  await expect(app.page.locator('#scorepane .reword')).toHaveCount(1);
  await start(app, { players: ['Ann', 'Bot 2'], bots: [1], options: { rounds: 1 } }); await place(app);
  await app.page.locator('#scorepane .story-rate [data-rate=fair]').click();
  for (let i = 0; i < 60 && (await st(app)).phase !== 'rate'; i++) { await app.run(pd => { pd.step(60); pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(250); }
  await expect(app.page.locator('#dockhint')).toHaveText('Bot 2 told a story: rate it');
  await expect(app.page.locator('#scorepane .gstat').first()).toContainText('Bot 2 told a story: rate it');
  await expect(app.page.locator('#scorepane .reword')).toHaveCount(0); await expect(app.page.locator('#scorepane')).not.toContainText('ad-lib');
});

test('story rating: game over shows an end screen with Play again and Done (PD-192)', async ({ shared: app }) => {
  await start(app, { options: { rounds: 1 } }); await place(app);
  await app.page.locator('#scorepane .story-rate [data-rate=good]').click();
  const pane = app.page.locator('#scorepane');
  await expect(pane.locator('.story-over')).toContainText('Game over: your total: 7'); await expect(app.page.locator('#dockhint')).toContainText('Game over: your total: 7');
  await expect(pane.getByRole('button', { name: 'Play again' })).toBeVisible(); await expect(pane.getByRole('button', { name: 'Done' }).first()).toBeVisible();
  await expect(pane.getByRole('button', { name: 'End game' })).toHaveCount(0);
  await expect(app.page.locator('#qbar #rollbtn')).toBeDisabled(); expect(await app.page.locator('#qbar #rollbtn').evaluate(e => +getComputedStyle(e).opacity)).toBeLessThan(0.6);
  const seed0 = await app.run(pd => pd.game.state.options.seed);
  await pane.getByRole('button', { name: 'Play again' }).click();
  const g = await app.run(pd => ({ s: pd.GAMES.status(pd.game.state), seed: pd.game.state.options.seed, players: pd.game.state.players, dice: pd.game.state.options.dice, snap: pd.state.substrate }));
  expect(g.s.phase).toBe('roll'); expect(g.s.scores).toEqual([0]); expect(g.players).toEqual(['Me']); expect(g.dice).toBe(3); expect(g.seed).not.toBe(seed0);
  await app.run(pd => pd.endGame()); await app.page.waitForTimeout(300);
  await start(app, { options: { rounds: 1 } }); await place(app); await app.page.locator('#scorepane .story-rate [data-rate=bad]').click();
  await pane.getByRole('button', { name: 'Done' }).last().click(); expect(await app.run(pd => !!pd.game)).toBe(false);
});

test('story rating: End game mid-game asks once; a finished game does not (PD-192)', async ({ shared: app }) => {
  await start(app, { options: { rounds: 1 } });
  const pane = app.page.locator('#scorepane');
  let dialogs = 0; app.page.on('dialog', d => { dialogs++; d.dismiss(); });
  await pane.locator('.gh button').click();
  await expect(pane.locator('.story-confirm')).toContainText('End the game? Scores will be lost.'); expect(await app.run(pd => !!pd.game)).toBe(true);
  await pane.getByRole('button', { name: 'Keep playing' }).click(); await expect(pane.locator('.story-confirm')).toHaveCount(0); expect(await app.run(pd => !!pd.game)).toBe(true);
  await pane.locator('.gh button').click(); await pane.locator('#endyes').click();
  expect(await app.run(pd => !!pd.game)).toBe(false); expect(dialogs, 'no browser confirm()').toBe(0);
  await start(app, { options: { rounds: 1 } }); await place(app); await pane.locator('.story-rate [data-rate=fair]').click();
  await expect(pane.locator('.gh button')).toHaveText('Done'); await pane.locator('.gh button').click();
  expect(await app.run(pd => !!pd.game)).toBe(false);
});

test('story rating: tapping the eye says what it does (PD-192)', async ({ shared: app }) => {
  await start(app, { vp: { width: 390, height: 844 } });
  await app.run(pd => { const t = document.getElementById('toast'); if (t) t.hidden = true; });
  const eye = app.page.locator('.peekh').first(); await eye.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' }); await eye.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
  await expect(app.page.locator('#toast')).toHaveText('Hold to look from above'); await expect(app.page.locator('#toast')).toBeVisible();
});
