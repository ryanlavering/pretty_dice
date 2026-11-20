// PD-181: Story Dice tray drags work while a story is being arranged (human stories stay editable until rated), are refused while a story is up for judging (bot or all-bot), and work again after the next roll.
import { test, expect } from './helpers/app.mjs';

const order = app => app.run(pd => pd.GAMES.status(pd.game.state).order);
const setup = async (app, seed, { bots, players = 2, rounds = 2 }) => {
  await app.reset(seed); await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', String(players));
  await app.page.locator('#scorepane input[type=number]').first().evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change')); }, '3');
  await app.page.locator('#scorepane input[type=number]').nth(1).evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change')); }, String(rounds));
  for (const b of bots) await app.page.check(`#scorepane input[aria-label="Seat ${b} is a computer player"]`);
  await app.nav.roll();
};
// drag tile i with the mouse onto ring k (or to an empty spot when k is null)
const drag = async (app, i, k) => {
  await app.page.waitForTimeout(500);   // let the tiles finish their slide
  const t = await app.page.locator(`#storytray .stile[data-i="${i}"]`).boundingBox();
  const to = k == null ? { x: t.x + t.width / 2, y: t.y + t.height / 2 + 150 } : await app.page.locator('#storytray .sring').nth(k).boundingBox().then(b => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 }));
  await app.page.mouse.move(t.x + t.width / 2, t.y + t.height / 2); await app.page.mouse.down();
  await app.page.mouse.move((t.x + to.x) / 2, (t.y + to.y) / 2, { steps: 4 }); await app.page.mouse.move(to.x, to.y, { steps: 4 }); await app.page.mouse.up();
};
const settleBots = async app => { for (let i = 0; i < 60; i++) {
  const st = await app.run(pd => pd.GAMES.status(pd.game.state)); if (st.phase === 'rate') break;
  await app.run(pd => { for (let k = 0; k < 60; k++) pd.renderOnce(1 / 60); const s = pd.GAMES.status(pd.game.state); if (s.botTurn && s.canRoll) pd.simRoll({ rerolls: 6 }); }); await app.page.waitForTimeout(250); } };

test('story dice: a human story stays editable when the rings fill, until it is rated (PD-181)', async ({ shared: app }) => {
  await setup(app, 91, { bots: [2] });
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await drag(app, 0, 0); await drag(app, 1, 1); await drag(app, 2, 2);
  expect(await order(app)).toEqual([0, 1, 2]);
  expect((await app.run(pd => pd.GAMES.status(pd.game.state))).phase).toBe('rate');   // full, but not auto-submitted
  await drag(app, 0, 2);   // rearrange: swap onto ring 3
  expect(await order(app)).toEqual([2, 1, 0]);
  await drag(app, 1, null);   // drag out of the rings
  expect((await order(app))[1]).toBe(null);
  await drag(app, 1, 1); expect(await order(app)).toEqual([2, 1, 0]);
});

test('story dice: a bot story is locked while it is judged, and the tray works again after the next roll (PD-181)', async ({ shared: app }) => {
  await setup(app, 92, { bots: [2], rounds: 2 });
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  for (const i of [0, 1, 2]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
  await app.page.click('text=Fair · 1');
  await expect.poll(() => app.run(pd => pd.GAMES.status(pd.game.state).botTurn), { timeout: 15000 }).toBe(true);
  await settleBots(app);
  const st = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(st.phase).toBe('rate'); expect(st.botTurn).toBe(true);
  await app.page.waitForTimeout(600);
  await drag(app, 0, 2); await drag(app, 1, null);
  expect(await order(app)).toEqual(st.order);   // refused: nothing moved
  expect(await app.page.locator('#storytray .stile.drag').count()).toBe(0);
  await app.page.click('text=Good · 2');   // judged; the human's own next turn: roll, then the tray works again
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await drag(app, 0, 1);
  expect((await order(app))[1]).toBe(0);
});

test('story dice: an all-bot game holds the dice locked in the judging pause (PD-181)', async ({ shared: app }) => {
  await setup(app, 93, { bots: [1, 2], rounds: 2 });
  await settleBots(app);
  const st = await app.run(pd => pd.GAMES.status(pd.game.state)); expect(st.phase).toBe('rate');
  await app.page.waitForTimeout(600);
  await drag(app, 0, 2); await drag(app, 1, null);
  expect(await order(app)).toEqual(st.order);
});
