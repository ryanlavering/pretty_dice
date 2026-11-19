// Story Dice in the app (PD-160 spike): glyph faces on the 3D dice, pack picker, tray ordering, rating and scoring.
import { test, expect } from './helpers/app.mjs';
const shot = process.env.STORY_SHOT;

test('story dice: setup picks packs, glyphs paint on the dice, tray orders them, rating scores', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  const setDice = n => app.page.locator('#scorepane input[type=number]').first().evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change')); }, String(n));
  await app.reset(7);
  const before = await app.run(pd => ({ sub: pd.state.substrate, draft: pd.bag.active.draft }));
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  expect(await app.run(pd => ({ shape: pd.state.shape, n: pd.state.notation, dice: pd.dice.length, sub: pd.state.substrate }))).toEqual({ shape: 'custom', n: '5d12', dice: 5, sub: 'solid' });   // the story dice are on the mat during setup
  await expect(app.page.locator('#scorepane')).toContainText('Glyph packs');
  await expect(app.page.locator('#scorepane')).toContainText('Everyday pictures'); await expect(app.page.locator('#scorepane')).toContainText('Hieroglyphs');
  await expect(app.page.locator('#scorepane')).toContainText('60 faces from 141 glyphs');
  // too many faces for the pool: start is disabled until another pack is added
  await app.page.selectOption('#scorepane select >> nth=2', '20'); await setDice(9);
  await expect(app.page.locator('#scorepane')).toContainText('too many'); await expect(app.page.locator('#scorepane button.big')).toBeDisabled();
  await app.page.locator('#scorepane label:has-text("Fantasy and adventure") input').check();
  await expect(app.page.locator('#scorepane button.big')).toBeEnabled();
  await app.page.selectOption('#scorepane select >> nth=2', '12'); await setDice(5);
  await app.page.locator('#scorepane label:has-text("Fantasy and adventure") input').uncheck();
  await app.page.locator('#scorepane label:has-text("Hieroglyphs") input').check();
  await app.nav.roll();   // Start game
  expect(await app.run(pd => ({ sub: pd.state.substrate, colors: pd.state.colors }))).toEqual({ sub: 'solid', colors: ['#efe9dc', '#efe9dc', '#efe9dc'] });   // starts from the plain default design
  const info = await app.run(pd => ({ n: pd.state.notation, game: pd.game.id, packs: pd.game.state.options.packs }));
  expect(info).toEqual({ n: '5d12', game: 'story', packs: ['noto', 'hiero'] });
  if (shot) { await app.page.waitForTimeout(800); await app.page.screenshot({ path: `${shot}/story-app-1-dice.png` }); }
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(st.phase).toBe('arrange'); expect(st.dice).toHaveLength(5);
  await expect(app.page.locator('#storytray .stile')).toHaveCount(5); await expect(app.page.locator('#storytray .sring')).toHaveCount(5);
  if (shot) { await app.page.waitForTimeout(700); await app.page.screenshot({ path: `${shot}/story-app-2-tray.png` }); }
  // click the tiles in order 4,2,0,1,3
  for (const i of [4, 2, 0, 1, 3]) { await app.page.locator(`#storytray .stile[data-i="${i}"]`).click(); await app.page.waitForTimeout(60); }
  expect((await app.run(pd => pd.GAMES.status(pd.game.state))).order).toEqual([4, 2, 0, 1, 3]);
  // 3D arrangement: the real dice flew up (scaled, lifted) and the roll's log entry carries the chosen order
  await app.run(pd => { for (let i = 0; i < 70; i++) pd.renderOnce(1 / 60); });
  expect(await app.run(pd => ({ vis: pd.dice.every(d => d.mesh.visible), flown: pd.dice.every(d => d.mesh.position.y > 2) }))).toEqual({ vis: true, flown: true });
  const logged = await app.run(pd => pd.bag.log[pd.bag.log.length - 1].story); expect(logged.split(' → ')).toHaveLength(5);
  await expect(app.page.locator('.story-sent')).toBeVisible(); await expect(app.page.locator('.story-sent')).toHaveText(/^[A-Z].*\.$/);
  const s1 = await app.page.locator('.story-sent').textContent(); await app.page.click('text=Re-word'); expect(await app.page.locator('.story-sent').textContent()).not.toBe(s1);
  await expect(app.page.locator('.story-hints > div')).toHaveCount(5);
  if (shot) { await app.page.waitForTimeout(700); await app.page.screenshot({ path: `${shot}/story-app-3-rate.png` }); }
  // reorder by dragging die 4 (ring 1) onto ring 3: autoswap
  await app.page.waitForTimeout(600);
  const b = async l => (await l.boundingBox()), t4 = await b(app.page.locator('#storytray .stile[data-i="4"]')), r3 = await b(app.page.locator('#storytray .sring').nth(2));
  await app.page.mouse.move(t4.x + t4.width / 2, t4.y + t4.height / 2); await app.page.mouse.down(); await app.page.mouse.move(r3.x + r3.width / 2, r3.y + r3.height / 2, { steps: 6 }); await app.page.mouse.up();
  expect((await app.run(pd => pd.GAMES.status(pd.game.state))).order).toEqual([0, 2, 4, 1, 3]);
  await app.page.click('text=Good · 2');
  const after = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(after.scores).toEqual([2]); expect(after.phase).toBe('roll'); expect(after.round).toBe(2);
  await expect(app.page.locator('#storytray')).toBeHidden();
  // second story: fair, game over
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  for (const i of [0, 1, 2, 3, 4]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await app.page.click('text=Fair · 1');
  expect((await app.run(pd => pd.GAMES.status(pd.game.state))).phase).toBe('over'); await expect(app.page.locator('#scorepane')).toContainText('Game over');
  // ending the game puts the player's own design back
  await app.run(pd => pd.endGame()); await app.page.waitForTimeout(500);
  expect(await app.run(pd => ({ sub: pd.state.substrate, draft: pd.bag.active.draft }))).toEqual(before);
  expect(errors).toEqual([]);
});

test('story dice setup preview: picking Story Dice shows the dice, another game or Close puts the old look back', async ({ shared: app }) => {
  await app.reset(79); await app.run(pd => { if (pd.game) pd.endGame(); });
  const before = await app.run(pd => ({ shape: pd.state.shape, n: pd.state.notation, sub: pd.state.substrate, draft: pd.bag.active.draft }));
  await app.run(pd => pd.openGames());
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  expect(await app.run(pd => pd.state.notation)).toBe('5d12');
  await app.page.selectOption('#scorepane select >> nth=2', '20'); expect(await app.run(pd => pd.state.notation)).toBe('5d20');   // an option change rebuilds the preview
  await app.page.selectOption('#scorepane select >> nth=0', 'pig'); await app.page.waitForTimeout(500);
  expect(await app.run(pd => ({ shape: pd.state.shape, n: pd.state.notation, sub: pd.state.substrate, draft: pd.bag.active.draft }))).toEqual(before);
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); expect(await app.run(pd => pd.state.shape)).toBe('custom');
  await app.page.click('#scorepane button:has-text("Close")'); await app.page.waitForTimeout(500);
  expect(await app.run(pd => ({ shape: pd.state.shape, n: pd.state.notation, sub: pd.state.substrate, draft: pd.bag.active.draft }))).toEqual(before);
});

test('story dice with a bot: the bot rolls, arranges, ad-libs; the human rates; tray is locked on its turn', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  await app.reset(77); await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', '2');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
  await app.page.locator('#scorepane input[type=number]').nth(1).evaluate(e => { e.value = '1'; e.dispatchEvent(new Event('change')); });
  await app.page.check('#scorepane input[aria-label="Seat 2 is a computer player"]');
  await app.nav.roll();
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bots)).toEqual([1]);
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  for (const i of [0, 1, 2]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await app.page.click('text=Fair · 1');
  await expect.poll(() => app.run(pd => pd.GAMES.status(pd.game.state).botTurn), { timeout: 15000 }).toBe(true);
  for (let i = 0; i < 40; i++) {   // the test page does not step physics by itself: settle the bot's throw by hand; the bot arranges on its own
    const st = await app.run(pd => pd.GAMES.status(pd.game.state)); if (st.phase === 'rate' || st.phase === 'over') break;
    await app.page.waitForTimeout(900);
    await app.run(pd => { const s = pd.GAMES.status(pd.game.state); if (s.botTurn && s.canRoll) pd.simRoll({ rerolls: 6 }); });
  }
  const st = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(st.phase).toBe('rate'); expect(st.botTurn).toBe(true); expect(st.order.every(x => x !== null)).toBe(true);
  await expect(app.page.locator('.story-sent')).toHaveText(/^[A-Z].*[.]$/); await expect(app.page.locator('#scorepane')).toContainText("ad-lib. Rate it!");
  await app.page.waitForTimeout(600);
  await app.page.locator('#storytray .stile[data-i="0"]').click({ force: true }); expect((await app.run(pd => pd.GAMES.status(pd.game.state))).order).toEqual(st.order);   // locked on the bot's turn
  const s1 = await app.page.locator('.story-sent').textContent(); await app.page.click('text=Re-word'); expect(await app.page.locator('.story-sent').textContent()).not.toBe(s1);
  await app.page.click('text=Good · 2');
  const fin = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(fin.phase).toBe('over'); expect(fin.scores).toEqual([1, 2]);
  await app.run(pd => pd.endGame()); expect(errors).toEqual([]);
});

import { test as base, expect as bexpect } from '@playwright/test';
test('story dice: more than 5 dice split into two rows and stay inside the screen on a phone', async ({ shared: app }) => {
  await app.reset(7); await app.page.setViewportSize({ width: 390, height: 844 }); await app.page.waitForTimeout(400);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '9'; e.dispatchEvent(new Event('change')); });
  await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await app.page.waitForTimeout(800);
  const box = await app.page.evaluate(() => { const r = document.querySelector('#storytray').getBoundingClientRect(); const f = e => { const b = e.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1; }; const rows = new Set([...document.querySelectorAll('#storytray .sring')].map(e => Math.round(e.getBoundingClientRect().top))); return { tiles: [...document.querySelectorAll('#storytray .stile')].every(f), rings: [...document.querySelectorAll('#storytray .sring')].every(f), ringRows: rows.size }; });
  expect(box).toEqual({ tiles: true, rings: true, ringRows: 2 });
});

base('story dice: ?game=story opens the Games setup on Story Dice', async ({ page }) => {
  await page.goto('/index.html?game=story');
  await bexpect(page.locator('#scorepane')).toContainText('Glyph packs', { timeout: 30000 });
  await bexpect(page.locator('#scorepane select').first()).toHaveValue('story');
});
