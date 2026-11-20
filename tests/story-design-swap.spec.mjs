// PD-180: changing the dice design during a Story Dice game keeps the 3D arrangement (it used to drop to the flat 2D tiles).
import { test, expect } from './helpers/app.mjs';

const view = app => app.run(pd => ({ gameDice: pd.game.info.dice.count, rolling: pd.rolling, d3: document.querySelector('#storytray')?.classList.contains('d3') || false, tiles: document.querySelectorAll('#storytray .stile').length, dice: pd.dice.length, vis: pd.dice.every(d => d.mesh.visible), phase: pd.GAMES.status(pd.game.state).phase, sub: pd.state.substrate, pal: pd.state.palettes.shared.join() }));
async function startStory(app, seed) {
  await app.reset(seed);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story');
  await app.nav.roll();   // Start game
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await expect(app.page.locator('#storytray .stile')).toHaveCount(5);
}

test('PD-180: swapping the design mid-game (Play room and Design room) keeps the 3D story arrangement', async ({ shared: app }) => {
  const errors = []; app.page.on('pageerror', e => errors.push(e.message));
  await startStory(app, 62);
  await app.page.waitForTimeout(400);
  const before = await view(app); expect(before).toMatchObject({ rolling: true, d3: true, tiles: 5, dice: 5 });
  const faces = () => app.run(pd => pd.bodies.map(b => [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
  const same = (x, y) => x.length === y.length && x.every((q, i) => Math.abs(q.reduce((d, v, k) => d + v * y[i][k], 0)) > 0.98);   // same orientation (quaternion dot, up to sign)
  const q0 = await faces();
  // Play room: add a different design to the bag (it becomes the active one)
  await app.run(async pd => { const j = pd.designToJSON(); j.substrate = 'swirl'; j.name = 'Swirly'; await pd.bagOps.addLoaded(JSON.parse(JSON.stringify(j))); });
  await app.page.waitForTimeout(800);
  let a = await view(app); expect(a).toMatchObject({ rolling: true, d3: true, tiles: 5, dice: 5, vis: true, sub: 'swirl' });
  expect(same(await faces(), q0)).toBe(true);   // the dice lie as they did
  // Design room: switch back to the first design there; the dice stay out of the roll view until Play
  await app.page.click('#back'); await app.page.waitForTimeout(200);
  await app.run(async pd => { await pd.bagActivate(pd.bag.designs[0].id); });
  await app.page.waitForTimeout(600);
  a = await view(app); expect(a).toMatchObject({ rolling: false, dice: 5, phase: 'arrange' });
  expect(a.sub).not.toBe('swirl');
  await app.page.click('#roll'); await app.page.waitForTimeout(800);
  a = await view(app); expect(a).toMatchObject({ rolling: true, d3: true, tiles: 5, dice: 5, vis: true });
  expect(same(await faces(), q0)).toBe(true);
  await expect(app.page.locator('#storytray .stile')).toHaveCount(5);
  expect(errors).toEqual([]);
});
