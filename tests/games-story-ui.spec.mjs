// Story Dice in the app (PD-160 spike): glyph faces on the 3D dice, pack picker, tray ordering, rating and scoring.
import { test, expect } from './helpers/app.mjs';
const shot = process.env.STORY_SHOT;

test('story dice: setup picks packs, glyphs paint on the dice, tray orders them, rating scores', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  const setDice = n => app.page.locator('#scorepane input[type=number]').first().evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change')); }, String(n));
  await app.reset(7, { plain: true });
  const before = await app.run(pd => ({ sub: pd.state.substrate, draft: pd.bag.active.draft }));
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  expect(await app.run(pd => ({ shape: pd.state.shape, n: pd.state.notation, dice: pd.dice.length, sub: pd.state.substrate }))).toEqual({ shape: 'custom', n: '5d12', dice: 5, sub: 'solid' });   // the story dice are on the mat during setup
  await expect(app.page.locator('#scorepane')).toContainText('Glyph packs');
  await expect(app.page.locator('#scorepane')).toContainText('Everyday pictures'); await expect(app.page.locator('#scorepane')).toContainText('Hieroglyphs');
  await expect(app.page.locator('#scorepane')).toContainText('60 faces from 141 glyphs');
  // too many faces for the pool: start is disabled until another pack is added
  await app.page.selectOption('#scorepane select >> nth=2', '20'); await setDice(9);
  await expect(app.page.locator('.story-warn')).toContainText('Not enough glyphs for 9 × d20'); await expect(app.page.locator('#scorepane button.big:has-text("Start game")')).toBeDisabled();
  expect(await app.run(pd => ({ n: pd.state.notation, shape: pd.state.shape }))).toEqual({ n: '9d12', shape: 'custom' });   // the mat shows the closest set that fits (glyph dice), not plain d6s
  await app.page.locator('.story-warn button').click(); await expect(app.page.locator('.story-warn')).toHaveCount(0); await expect(app.page.locator('#scorepane button.big:has-text("Start game")')).toBeEnabled();
  await app.page.selectOption('#scorepane select >> nth=2', '20'); await setDice(9); await expect(app.page.locator('.story-warn')).toHaveCount(1);
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
  await app.page.click('.story-rate [data-rate=good]');
  const after = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(after.scores).toEqual([7]); expect(after.phase).toBe('roll'); expect(after.round).toBe(2);
  await expect(app.page.locator('#storytray')).toBeHidden();
  // second story: fair, game over
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  for (const i of [0, 1, 2, 3, 4]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await app.page.click('.story-rate [data-rate=fair]');
  expect((await app.run(pd => pd.GAMES.status(pd.game.state))).phase).toBe('over'); await expect(app.page.locator('#scorepane')).toContainText('Game over');
  // ending the game puts the player's own design back
  await app.run(pd => pd.endGame()); await app.page.waitForTimeout(500);
  expect(await app.run(pd => ({ sub: pd.state.substrate, draft: pd.bag.active.draft }))).toEqual(before);
  expect(errors).toEqual([]);
});

test('story dice setup preview: picking Story Dice shows the dice, another game or Close puts the old look back', async ({ shared: app }) => {
  await app.reset(79, { plain: true }); await app.run(pd => { if (pd.game) pd.endGame(); });
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
  await app.reset(77, { plain: true }); await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', '2');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
  await app.page.locator('#scorepane input[type=number]').nth(1).evaluate(e => { e.value = '1'; e.dispatchEvent(new Event('change')); });
  await app.page.check('#scorepane input[aria-label="Seat 2 is a computer player"]');
  await app.nav.roll();
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bots)).toEqual([1]);
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  for (const i of [0, 1, 2]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await app.page.click('.story-rate [data-rate=fair]');
  await expect.poll(() => app.run(pd => pd.GAMES.status(pd.game.state).botTurn), { timeout: 15000 }).toBe(true);
  for (let i = 0; i < 40; i++) {   // the test page does not step physics by itself: settle the bot's throw by hand; the bot arranges on its own
    const st = await app.run(pd => pd.GAMES.status(pd.game.state)); if (st.phase === 'rate' || st.phase === 'over') break;
    await app.page.waitForTimeout(900);
    await app.run(pd => { const s = pd.GAMES.status(pd.game.state); if (s.botTurn && s.canRoll) pd.simRoll({ rerolls: 6 }); });
  }
  const st = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(st.phase).toBe('rate'); expect(st.botTurn).toBe(true); expect(st.order.every(x => x !== null)).toBe(true);
  await expect(app.page.locator('.story-sent')).toHaveText(/^[A-Z].*[.]$/); await expect(app.page.locator('#scorepane')).toContainText('told a story: rate it');
  await app.page.waitForTimeout(4000);   // PD-173: the bot's story never advances on its own; it waits for the human to judge it
  expect(await app.run(pd => { const s = pd.GAMES.status(pd.game.state); return [s.phase, s.botTurn, s.round]; })).toEqual(['rate', true, st.round]);
  await expect(app.page.locator('.story-rate button')).toHaveCount(5);
  await app.page.waitForTimeout(600);
  await app.page.locator('#storytray .stile[data-i="0"]').click({ force: true }); expect((await app.run(pd => pd.GAMES.status(pd.game.state))).order).toEqual(st.order);   // locked on the bot's turn
  await expect(app.page.locator('#scorepane .reword')).toHaveCount(0);   // PD-192: a bot's ad-lib is what it said; no Re-word on it
  await app.page.click('.story-rate [data-rate=good]');
  const fin = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(fin.phase).toBe('over'); expect(fin.scores).toEqual([5, 7]);
  await app.run(pd => pd.endGame()); expect(errors).toEqual([]);
});

import { test as base, expect as bexpect } from '@playwright/test';
test('story dice: more than 5 dice split into two rows and stay inside the screen on a phone', async ({ shared: app }) => {
  await app.reset(7, { plain: true }); await app.page.setViewportSize({ width: 390, height: 844 }); await app.page.waitForTimeout(400);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '9'; e.dispatchEvent(new Event('change')); });
  await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await app.page.waitForTimeout(800);
  const box = await app.page.evaluate(() => { const r = document.querySelector('#storytray').getBoundingClientRect(); const f = e => { const b = e.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1; }; const rows = new Set([...document.querySelectorAll('#storytray .sring')].map(e => Math.round(e.getBoundingClientRect().top))); return { tiles: [...document.querySelectorAll('#storytray .stile')].every(f), rings: [...document.querySelectorAll('#storytray .sring')].every(f), ringRows: rows.size }; });
  expect(box).toEqual({ tiles: true, rings: true, ringRows: 2 });
});

test('story dice: a dragged die grows only a little and its screen bounds stay clear of its neighbours (PD-171)', async ({ shared: app }) => {
  await app.reset(11, { plain: true }); await app.page.waitForTimeout(300);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await app.run(pd => pd.resume()); await app.page.waitForTimeout(2200);   // let the dice fly up into the line
  const bounds = () => app.run(pd => {   // each die as a screen circle (projected bounding sphere), page px
    const r = pd.canvas.getBoundingClientRect(), cam = pd.camera; cam.updateMatrixWorld(); const out = [];
    for (const d of pd.dice) { d.mesh.updateMatrixWorld(true); const g = d.mesh.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere.center.clone().applyMatrix4(d.mesh.matrixWorld), rad = g.boundingSphere.radius * d.mesh.scale.x, V = c.constructor;
      const right = new V(1, 0, 0).applyQuaternion(cam.quaternion).multiplyScalar(rad), p0 = c.clone().project(cam), p1 = c.clone().add(right).project(cam);
      out.push({ x: r.left + (p0.x + 1) / 2 * r.width, y: r.top + (1 - p0.y) / 2 * r.height, rad: Math.abs(p1.x - p0.x) / 2 * r.width }); }
    return out; });
  const rest = await bounds(), t2 = await app.page.locator('#storytray .stile[data-i="2"]').boundingBox();
  await app.page.mouse.move(t2.x + t2.width / 2, t2.y + t2.height / 2); await app.page.mouse.down(); await app.page.mouse.move(t2.x + t2.width / 2, t2.y + t2.height / 2 + 30, { steps: 5 });
  await app.page.waitForTimeout(700);
  const held = await bounds(), w = b => b.rad;
  await app.page.mouse.up();
  expect(w(held[2]) / w(rest[2])).toBeLessThan(1.35);
  const hit = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < (a.rad + b.rad) * 0.62;   // 0.62: a cube fills about that much of its bounding sphere
  held.forEach((b, i) => { if (i !== 2) expect(hit(held[2], b), `dragged die overlaps die ${i}`).toBe(false); });
});

test('story dice: landscape phone keeps one row for 9 dice, and the layout follows a resize (PD-174)', async ({ shared: app }) => {
  await app.reset(7, { plain: true }); await app.page.setViewportSize({ width: 844, height: 390 }); await app.page.waitForTimeout(400);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '9'; e.dispatchEvent(new Event('change')); });
  await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await app.page.waitForTimeout(800);
  const rows = () => app.page.evaluate(() => new Set([...document.querySelectorAll('#storytray .sring')].map(e => Math.round(e.getBoundingClientRect().top))).size);
  expect(await rows()).toBe(1);
  await app.page.setViewportSize({ width: 390, height: 844 }); await expect.poll(rows, { timeout: 5000 }).toBe(2);   // portrait: two rows, laid out again after the resize
  await app.page.setViewportSize({ width: 844, height: 390 }); await expect.poll(rows, { timeout: 5000 }).toBe(1);
});

base('story dice: ?game=story opens the Games setup on Story Dice', async ({ page }) => {
  await page.goto('/index.html?game=story');
  await bexpect(page.locator('#scorepane')).toContainText('Glyph packs', { timeout: 30000 });
  await bexpect(page.locator('#scorepane select').first()).toHaveValue('story');
});

test('story dice: full view with the pane closed, the mat shows the sentence, the dock the rating and result (PD-176)', async ({ shared: app }) => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 740 }]) {
    await app.reset(78, { plain: true }); await app.page.setViewportSize(vp); await app.page.waitForTimeout(400);
    await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
    await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', '2');
    await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
    await app.page.locator('#scorepane input[type=number]').nth(1).evaluate(e => { e.value = '2'; e.dispatchEvent(new Event('change')); });
    await app.nav.roll();
    await app.run(pd => pd.simRoll({ rerolls: 6 }));
    await app.page.waitForTimeout(900);
    await app.run(pd => { pd.setFull(true); });
    await expect(app.page.locator('#dockhint')).toContainText('Put the dice in story order');
    if (shot) await app.page.screenshot({ path: `${shot}/story-${vp.width}-arrange.png` });
    for (const i of [0, 1, 2]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
    const sent = (await app.page.locator('.story-sent').textContent()).trim();
    await expect(app.page.locator('#storytray .ssent')).toBeVisible();
    await expect(app.page.locator('#storytray .ssent')).toContainText(sent);
    await expect(app.page.locator('#storytray .ssent')).toContainText('Tell your own');
    const geo = await app.page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(), t = q('#storytray .ssent'), d = q('#qbar'), rs = [...document.querySelectorAll('#storytray .sring')].map(e => e.getBoundingClientRect());
      return { inside: t.left >= 0 && t.right <= innerWidth && t.top >= 0 && t.bottom <= innerHeight, clearOfRings: rs.every(r => t.top >= r.bottom - 1), clearOfDock: t.bottom <= d.top + 1, dockHasSentence: document.querySelector('#dockhint').textContent.includes(document.querySelector('#storytray .ssent').textContent.slice(-12)) }; });
    expect(geo).toEqual({ inside: true, clearOfRings: true, clearOfDock: true, dockHasSentence: false });
    await expect(app.page.locator('#dockhint')).toContainText('Everyone else judges');
    await expect(app.page.locator('#qbar [data-act=rate-good]')).toBeVisible();
    const inView = await app.page.evaluate(() => { const r = document.querySelector('#qbar').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
    expect(inView).toBe(true);
    if (shot) { await app.run(pd => { for (let i = 0; i < 90; i++) pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(600); await app.page.screenshot({ path: `${shot}/story-${vp.width}-rate.png` }); }
    await app.page.locator('#qbar [data-act=rate-good]').click();
    expect((await app.run(pd => pd.GAMES.status(pd.game.state))).scores[0]).toBe(7);
    await expect(app.page.locator('#dockhint')).toContainText('Last story +7 (good)');
  }
});

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 740 }]) test(`story dice: shots of the arrangement with the pane open, ${vp.width} wide (PD-175 visual check, STORY_SHOT only)`, async ({ shared: app }) => {
  test.skip(!shot, 'screenshots only'); {
    await app.reset(78, { plain: true }); await app.page.setViewportSize(vp); await app.page.waitForTimeout(400);
    await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
    await app.page.selectOption('#scorepane select >> nth=0', 'story');
    await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); await app.page.waitForTimeout(500); await app.run(pd => { for (let i = 0; i < 90; i++) pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(700); 
    await app.page.screenshot({ path: `${shot}/story-${vp.width}-arrange-pane.png` });
    for (const i of [0, 1]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
    await app.run(pd => { for (let i = 0; i < 90; i++) pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(700); await app.page.screenshot({ path: `${shot}/story-${vp.width}-partial-pane.png` });
  }
});

test('story dice: a game with only bots stops in the rate phase until a human grades it (PD-173)', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  await app.reset(81, { plain: true }); await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', '2');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
  await app.page.locator('#scorepane input[type=number]').nth(1).evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
  await app.page.check('#scorepane input[aria-label="Seat 1 is a computer player"]'); await app.page.check('#scorepane input[aria-label="Seat 2 is a computer player"]');
  await app.nav.roll();
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bots)).toEqual([0, 1]);
  for (let i = 0; i < 60; i++) {   // the test page does not step physics by itself: settle the bot's throw by hand
    const st = await app.run(pd => pd.GAMES.status(pd.game.state)); if (st.phase === 'rate') break;   // the test page does not step physics by itself; pd.step(n) steps without drawing each frame (~100 ms each in swiftshader)
    await app.run(pd => { pd.step(60); pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(250);
  }
  const rated = () => app.run(pd => { const s = pd.GAMES.status(pd.game.state); return { phase: s.phase, round: s.round, player: s.player, scores: s.scores }; });
  const at = await rated(); expect(at.phase).toBe('rate'); expect(at.round).toBe(1);
  await app.page.waitForTimeout(4000);   // nothing rates it, nothing moves on
  expect(await rated()).toEqual(at);
  await expect(app.page.locator('#qbar [data-act=rate-good]')).toBeVisible(); await expect(app.page.locator('#storytray .ssent')).toContainText("'s story");
  await app.page.locator('#qbar [data-act=rate-good]').click();
  const next = await app.run(pd => { const s = pd.GAMES.status(pd.game.state); return { scores: s.scores, player: s.player, phase: s.phase }; });
  expect(next.scores[at.player]).toBe(7); expect(next.player).not.toBe(at.player);   // the grade advanced to the other bot
  expect(errors).toEqual([]);
});

test('story dice: a blank bot name never shows a dangling "Judge \'s story" (PD-184)', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  await app.reset(82, { plain: true }); await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', '2');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
  await app.page.locator('#scorepane input[type=number]').nth(1).evaluate(e => { e.value = '2'; e.dispatchEvent(new Event('change')); });
  await app.page.check('#scorepane input[aria-label="Seat 1 is a computer player"]'); await app.page.check('#scorepane input[aria-label="Seat 2 is a computer player"]');
  for (const i of [1, 2]) await app.page.fill(`#scorepane input[aria-label="Player ${i} name"]`, '   ');
  await app.nav.roll();
  for (let i = 0; i < 60; i++) {
    const st = await app.run(pd => pd.GAMES.status(pd.game.state)); if (st.phase === 'rate') break;
    await app.run(pd => { pd.step(60); pd.renderOnce(1 / 60); }); await app.page.waitForTimeout(250);
  }
  await expect(app.page.locator('#qbar [data-act=rate-good]')).toBeVisible();
  await app.page.waitForTimeout(300);
  const names = await app.run(pd => pd.game.state.players);
  const txt = await app.page.evaluate(() => ({ tray: document.querySelector('#storytray .ssent')?.textContent || '', dock: document.querySelector('#dockhint').textContent, pane: document.querySelector('#scorepane').textContent }));
  for (const t of Object.values(txt)) { expect(t).not.toMatch(/Judge\s+'s|judge\s+'s|^\s*'s story|\s's story/i); expect(t).not.toMatch(/^: /); }
  expect(txt.tray + txt.dock).toMatch(/told a story: rate it/i);   // the judge prompt is still there, with a fallback label if the name is blank (names: ${names})
  expect(errors).toEqual([]);
});

for (const vp of [{ width: 390, height: 740 }, { width: 740, height: 390 }, { width: 1280, height: 800 }]) test(`story dice: a long story sentence on the mat wraps and is fully visible, ${vp.width}x${vp.height} (PD-184)`, async ({ shared: app }) => {
  await app.reset(78, { plain: true }); await app.page.setViewportSize(vp); await app.page.waitForTimeout(400);
  await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '9'; e.dispatchEvent(new Event('change')); });
  await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); await app.page.waitForTimeout(900);
  await app.run(pd => { pd.setFull(true); });
  for (let i = 0; i < 9; i++) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await expect(app.page.locator('#storytray .ssent')).toBeVisible();
  const g = await app.page.evaluate(() => { const e = document.querySelector('#storytray .ssent'), t = e.getBoundingClientRect(), st = document.querySelector('#storytray').getBoundingClientRect(), d = document.querySelector('#qbar').getBoundingClientRect(), cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    const rs = [...document.querySelectorAll('#storytray .sring')].map(x => x.getBoundingClientRect());
    return { inStage: t.left >= st.left && t.right <= st.right && t.top >= st.top && t.bottom <= st.bottom, notClipped: e.scrollHeight <= e.clientHeight + 1, lines: Math.round((t.height - 16) / lh), clearOfRings: rs.every(r => t.top >= r.bottom - 1), clearOfDock: t.bottom <= d.top + 1, len: e.textContent.length }; });
  expect(g.len).toBeGreaterThan(40);
  expect(g).toMatchObject({ inStage: true, notClipped: true, clearOfRings: true, clearOfDock: true }); expect(g.lines).toBeLessThanOrEqual(4);
  if (shot) await app.page.screenshot({ path: `${shot}/pd184-${vp.width}x${vp.height}.png` });
});

// PD-186: the story dock wraps to two rows during the game; it must give the one-row dock back when the game ends
test('story dice on a phone: the dock returns to its pre-game height after the game ends (PD-186)', async ({ shared: app }) => {
  await app.reset(79, { plain: true }); await app.page.setViewportSize({ width: 390, height: 844 }); await app.page.waitForTimeout(400);
  await app.run(pd => { if (pd.game) pd.endGame(); });
  const h = () => app.page.evaluate(() => { const b = document.querySelector('#qbar'); return b.hidden ? 0 : Math.round(b.getBoundingClientRect().height); });
  await app.run(pd => pd.openGames()); await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.run(pd => { pd.endGame && pd.game && pd.game.setup && 0; });
  await app.run(pd => { if (pd.game) pd.endGame(); }); await app.page.waitForTimeout(200);
  const before = await h();
  await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); await app.page.waitForTimeout(300);
  await app.run(pd => pd.renderGame());
  await expect(app.page.locator('#qbar.storyq')).toHaveCount(1);
  expect(await h()).toBeGreaterThan(before);   // the story dock is the taller, wrapped one
  await app.run(pd => pd.endGame()); await app.page.waitForTimeout(300);
  await expect(app.page.locator('#qbar.storyq')).toHaveCount(0);
  expect(await h()).toBe(before);
  await app.page.setViewportSize({ width: 1280, height: 720 });
});

test('story dice: the roll log shows glyph names without a sum, and applying a set mid-game neither rolls nor logs (PD-192 D)', async ({ shared: app }) => {
  await app.reset(7, { plain: true });
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.nav.roll();   // Start game
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const e = await app.run(pd => pd.bag.log.at(-1));
  expect(e.total).toBe(''); expect(e.detail).toMatch(/^5d12: ([a-z0-9 ]+=\d+)( \+ [a-z0-9 ]+=\d+){4}$/i);
  const r = await app.run(async pd => {
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'other', name: 'Other', terms: [{ count: 2, sides: 6 }], mod: 0 }, { id: 'same', name: 'Same', terms: [{ count: 5, sides: 12 }], mod: 0 }], active: { design: 'a' } });
    const n0 = pd.bag.log.length, a = pd.setOps.quick('other'), n1 = pd.bag.log.length, msg = document.querySelector('#scorepane').textContent;
    const b = pd.setOps.quick('same'); return { n0, n1, n2: pd.bag.log.length, a, b, msg, game: pd.game && pd.game.id };
  });
  expect(r.game).toBe('story'); expect(r.a).toBeNull(); expect(r.b).toBeNull();
  expect(r.n1).toBe(r.n0); expect(r.n2).toBe(r.n0); expect(r.msg).toContain('The game fixes the dice');
});
