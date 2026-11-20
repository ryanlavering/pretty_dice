// PD-187: the game look is a temporary draft; the player's own design, bag and sets are never touched by it.
import { test, expect } from './helpers/app.mjs';

const mine = app => app.run(pd => ({ look: JSON.stringify(pd.designToJSON()), designs: pd.bag.designs.map(d => d.id + ':' + JSON.stringify(d.design)), active: JSON.stringify(pd.bag.active), pending: JSON.stringify(pd.bag.pending), draft: JSON.stringify(pd.bag.draft), sets: pd.bag.sets.length, setIds: pd.bag.sets.map(s => s.id).join() }));
async function addDesign(app, name, sub) { await app.run(async (pd, a) => { const j = pd.designToJSON(); j.substrate = a.sub; j.colors = a.cols; j.name = a.name; await pd.bagOps.addLoaded(JSON.parse(JSON.stringify(j))); }, { name, sub, cols: sub === 'swirl' ? ['#aa2233', '#33aa44', '#2233aa'] : ['#112233', '#445566', '#778899'] }); await app.page.waitForTimeout(700); }
async function startGame(app, id) {
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', id);
  await app.nav.roll();
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
}
const endIt = async app => { await app.run(pd => pd.endGame()); await app.page.waitForTimeout(600); };

test('PD-187: a Story Dice round leaves the player\'s design, bag and sets exactly as they were', async ({ app }) => {
  await app.open({ seed: 187 });
  await addDesign(app, 'Mine', 'swirl');
  const before = await mine(app);
  await startGame(app, 'story');
  expect(await app.run(pd => pd.state.substrate)).toBe('solid');   // the temporary look: plain white dice
  const mid = await mine(app);
  expect(mid.designs).toEqual(before.designs); expect(mid.pending).toBe(before.pending); expect(mid.sets).toBe(before.sets);   // nothing in the bag changed during the game
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  await endIt(app);
  expect(await mine(app)).toEqual(before);
});

test('PD-187: unsaved edits on the player\'s design survive a Story Dice round', async ({ app }) => {
  await app.open({ seed: 188 });
  await addDesign(app, 'Mine', 'swirl');
  await app.run(pd => { pd.state.polish = 0.91; pd.applyLook(); });
  await app.page.waitForTimeout(300);
  const before = await mine(app);
  expect(JSON.parse(before.pending)).not.toEqual({});
  await startGame(app, 'story'); await endIt(app);
  expect(await mine(app)).toEqual(before);
});

test('PD-187: a design picked mid-game is kept after the game; the other design is not overwritten', async ({ app }) => {
  await app.open({ seed: 189 });
  await addDesign(app, 'Mine', 'swirl');
  await addDesign(app, 'Other', 'solid');
  await app.run(async pd => { await pd.bagActivate(pd.bag.designs[1].id); });   // back to "Mine"
  await app.page.waitForTimeout(500);
  const pre = await mine(app); const preDesigns = pre.designs;
  await startGame(app, 'story');
  await app.run(async pd => { await pd.bagActivate(pd.bag.designs[2].id); });   // deliberate pick: "Other"
  await app.page.waitForTimeout(700);
  const picked = await mine(app);
  expect(picked.designs).toEqual(preDesigns); expect(picked.pending).toBe('{}');
  await endIt(app);
  const after = await mine(app);
  expect(after.designs).toEqual(preDesigns); expect(after.pending).toBe('{}'); expect(after.sets).toBe(pre.sets);
  expect(after.look).toBe(picked.look); expect(await app.run(pd => pd.bag.active.design)).toBe(await app.run(pd => pd.bag.designs[2].id));   // the pick became the design after the game
});

test('PD-187: Randomize mid-game is the player\'s own draft and stays; their design is untouched', async ({ app }) => {
  await app.open({ seed: 190 });
  await addDesign(app, 'Mine', 'swirl');
  const pre = await mine(app);
  await startGame(app, 'story');
  await app.run(pd => pd.randomize()); await app.page.waitForTimeout(500);
  const rnd = await mine(app);
  await endIt(app);
  const after = await mine(app);
  expect(after.look).toBe(rnd.look); expect(after.designs).toEqual(pre.designs); expect(after.sets).toBe(pre.sets);
});

for (const id of ['pig', 'yahtzee', 'farkle', 'liarsdice']) {
  test(`PD-187: ${id} leaves the player's design, bag and sets exactly as they were`, async ({ app }) => {
    await app.open({ seed: 191 });
    await addDesign(app, 'Mine', 'swirl');
    const before = await mine(app);
    await startGame(app, id); await endIt(app);
    expect(await mine(app)).toEqual(before);
  });
}
