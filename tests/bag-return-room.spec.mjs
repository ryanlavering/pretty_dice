// PD-197: picking a design in the Bag leaves you in the room the Bag was opened from (it used to land in Design).
import { test, expect } from './helpers/app.mjs';

const room = app => app.run(() => document.body.classList.contains('design') ? 'design' : 'play');
test.setTimeout(240_000);
async function twoDesigns(app, dice) {   // the second design is active; the first is the one to pick. dice: the second design also carries other dice
  await app.run(async (pd, dice) => { const j = pd.designToJSON(); j.substrate = 'swirl'; j.name = 'Swirly'; if (dice) Object.assign(j, dice); await pd.bagOps.addLoaded(JSON.parse(JSON.stringify(j))); }, dice);
  await app.page.waitForTimeout(500);
}
async function pickFirst(app) {
  await app.page.click('#bagbtn');
  const tile = app.page.locator('#bagsheet .tile[data-id]').first();
  await tile.click(); await app.page.waitForTimeout(800);
}
const sub = app => app.run(pd => pd.state.substrate);

test('PD-197: Play room idle, pick returns to Play', async ({ shared: app }) => {
  await app.reset(71); await app.nav.toPlay(); await twoDesigns(app);
  expect(await room(app)).toBe('play'); const s0 = await sub(app);
  await pickFirst(app);
  expect(await room(app)).toBe('play'); expect(await sub(app)).not.toBe(s0);
});

test('PD-197: Play with a Yahtzee game, pick returns to Play', async ({ shared: app }) => {
  await app.reset(72); await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee'); await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 })); await twoDesigns(app);
  expect(await room(app)).toBe('play'); const s0 = await sub(app);
  await pickFirst(app);
  expect(await room(app)).toBe('play'); expect(await sub(app)).not.toBe(s0);
  expect(await app.run(pd => !!pd.game)).toBe(true);
});

test('PD-197: Play with a Story Dice game, pick returns to Play and only the look changes', async ({ shared: app }) => {
  await app.reset(73); await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 })); await expect(app.page.locator('#storytray .stile')).toHaveCount(5);
  await twoDesigns(app);
  expect(await room(app)).toBe('play'); const s0 = await sub(app);
  await pickFirst(app);
  expect(await room(app)).toBe('play'); expect(await sub(app)).not.toBe(s0);
  await expect(app.page.locator('#storytray .stile')).toHaveCount(5);
});

test('PD-197: Design room, pick stays in Design', async ({ shared: app }) => {
  await app.reset(74); await twoDesigns(app);
  expect(await room(app)).toBe('design'); const s0 = await sub(app);
  await pickFirst(app);
  expect(await room(app)).toBe('design'); expect(await sub(app)).not.toBe(s0);
});

const dice = app => app.run(pd => [pd.state.shape, pd.state.notation]);
const D8 = { shape: 'd8', notation: '3d8' };

test('PD-197: Play idle, a design saved with other dice applies its look only; the formula stays', async ({ shared: app }) => {
  await app.reset(75); await app.nav.toPlay(); await twoDesigns(app, D8);
  const d0 = await dice(app), s0 = await sub(app); expect(d0[1]).not.toBe('3d8');   // even adding the d8 design in Play kept the formula
  await pickFirst(app);
  expect(await room(app)).toBe('play'); expect(await sub(app)).not.toBe(s0);
  expect(await dice(app)).toEqual(d0);
});

test('PD-197 (4.2, intended change: designs are looks): Design room, picking a design keeps the formula', async ({ shared: app }) => {
  await app.reset(76); await twoDesigns(app, D8);
  await app.run(pd => { pd.state.shape = 'custom'; pd.state.notation = '3d8'; });   // the player's own formula; the design suggests the d8 shape
  expect((await dice(app))[1]).toBe('3d8');
  await pickFirst(app);
  expect(await room(app)).toBe('design');
  expect((await dice(app))[1]).toBe('3d8');   // PD-202: the design's own dice are only a suggestion
});
