// Story Dice in the app (PD-160 spike): glyph faces on the 3D dice, pack picker, tray ordering, rating and scoring.
import { test, expect } from './helpers/app.mjs';
const shot = process.env.STORY_SHOT;

test('story dice: setup picks packs, glyphs paint on the dice, tray orders them, rating scores', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  const setDice = n => app.page.locator('#scorepane input[type=number]').first().evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change')); }, String(n));
  await app.reset(7);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
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
  expect(errors).toEqual([]);
});
