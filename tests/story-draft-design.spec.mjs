// PD-187: the game look is a temporary draft; the player's own design, bag and sets are never touched by it.
import { test, expect } from './helpers/app.mjs';

const mine = app => app.run(pd => ({ look: JSON.stringify(pd.designToJSON()), designs: pd.bag.designs.map(d => d.id + ':' + JSON.stringify(d.design)), active: JSON.stringify(pd.bag.active), pending: JSON.stringify(pd.bag.pending), draft: JSON.stringify(pd.bag.draft), sets: pd.bag.sets.length, setIds: pd.bag.sets.map(s => s.id).join() }));
// PD-206 (4.2 S3, intended): the look is compared without the dice. After a game the mat holds the player's own dice again (a pick mid-game used to leave the game's dice behind: the 4.1 P4 bug)
const lookOf = j => { const o = JSON.parse(j); delete o.shape; delete o.notation; return JSON.stringify(o); };
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
  expect(lookOf(after.look)).toBe(lookOf(picked.look)); expect(JSON.parse(after.look).shape).toBe(JSON.parse(pre.look).shape); expect(await app.run(pd => pd.bag.active.design)).toBe(await app.run(pd => pd.bag.designs[2].id));   // the pick became the design after the game
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
  expect(lookOf(after.look)).toBe(lookOf(rnd.look)); expect(JSON.parse(after.look).shape).toBe(JSON.parse(pre.look).shape); expect(after.designs).toEqual(pre.designs); expect(after.sets).toBe(pre.sets);
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

// PD-187 mitigation (4.1): while the game look is live nothing in the bag may write it into the player's design or drop their unsaved edits.
test('PD-187: Save / Copy JSON / menu Save / Revert / Undo mid-Story leave the design and its unsaved edits alone; the Bag shows the player\'s picture and a live dashed game ghost', async ({ app, page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await app.open({ seed: 192, plain: true });
  await addDesign(app, 'Mine', 'swirl');
  await app.run(pd => { pd.state.polish = 0.93; pd.applyLook(); });
  await page.waitForTimeout(300);
  const before = await mine(app);
  expect(JSON.parse(before.pending)).not.toEqual({});   // unsaved edits on the active design
  const myId = await app.run(pd => pd.bag.active.design);
  const myPic = await app.run(pd => JSON.stringify(pd.bag.pending[pd.bag.active.design]));
  await startGame(app, 'story');
  const dice0 = await app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length }));
  expect(dice0.n).toBeGreaterThan(0);

  // PD-190: the Bag shows the game draft as a live dashed ghost (header: draft name, Save as design / Discard); the player's own tile keeps the player's picture and Modified dot
  await expect(page.locator('#bagname')).toHaveText('Story Dice look');
  await expect(page.locator('#bagpos')).toContainText('draft for this game');
  const cards = page.locator('#cards .card');
  const game = cards.filter({ hasText: 'Story Dice look' });
  await expect(game).toHaveCount(1);
  await expect(game).toHaveClass(/ghost/); await expect(game).toHaveClass(/\bon\b/); await expect(game).toHaveAttribute('title', 'Draft look for this game: edit it, Save as design, or Discard');
  await expect(cards.filter({ hasText: 'Mine' }).locator('.dot')).toHaveCount(1);   // the player's design still shows its own unsaved edits
  expect(await app.run(pd => pd.bag.active.design)).toBe(myId);
  expect(await app.run(() => !document.querySelector('#bagact').hidden)).toBe(true); await expect(page.locator('#dkeep')).toHaveText('Save as design'); await expect(page.locator('#ddiscard')).toHaveText('Discard');
  expect(await app.run(pd => !!document.querySelector('#bagth').style.backgroundImage)).toBe(true);

  // the tile menus (PD-190): the player's design acts on its own pending edits only; the ghost offers Save as design / Rename / Discard
  await app.nav.openBag();
  await expect(page.locator('#tiles .tile.ghost')).toHaveCount(1);
  await page.locator(`#tiles .tile[data-id="${myId}"] .dots`).click(); await page.waitForTimeout(300);
  expect(await app.run(() => [...document.querySelectorAll('#cardmenu button')].map(b => b.textContent).slice(0, 3))).toEqual(['Save', 'Save as copy', 'Revert']);
  await page.keyboard.press('Escape'); await page.mouse.click(5, 5);
  await page.locator('#tiles .tile[data-id="gdraft"] .dots').click(); await page.waitForTimeout(300);
  expect(await app.run(() => [...document.querySelectorAll('#cardmenu button')].map(b => b.textContent))).toEqual(['Save as design', 'Rename…', 'Discard (use my design)']);
  await page.keyboard.press('Escape'); await page.mouse.click(5, 5);
  const mid = await mine(app);
  expect(mid.designs).toEqual(before.designs); expect(mid.pending).toBe(before.pending); expect(mid.sets).toBe(before.sets);
  expect(await app.run(pd => JSON.stringify(pd.bag.pending[pd.bag.active.design]))).toBe(myPic);

  // Save bag file and Copy JSON: the player's pending edits are saved into the player's design (memo S7), the game look goes nowhere
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sheetsave')]);
  const file = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  expect(file.designs.find(d => d.id === myId).design.substrate, 'saved design keeps its own look').toBe('swirl');
  expect(JSON.stringify(file.designs.find(d => d.id === myId).design), 'the pending edits were saved into the design').toBe(myPic);
  expect(JSON.stringify(file)).not.toContain('Story Dice look'); expect(file.hold).toBeUndefined();
  await page.click('#sheetcopy'); await page.waitForTimeout(300);
  await page.click('#sheetclose');
  expect(await app.run(pd => ({ sub: pd.state.substrate, draft: pd.bag.active.draft, pending: Object.keys(pd.bag.pending).length, saved: JSON.stringify(pd.bag.designs.find(d => d.id === pd.bag.active.design).design) }))).toEqual({ sub: 'solid', draft: 'game', pending: 0, saved: myPic });

  // Undo mid-game cannot bring back the pre-game look or dice count
  await app.run(async pd => { await pd.undo(); await pd.undo(); }); await page.waitForTimeout(400);
  expect(await app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length, sub: pd.state.substrate }))).toEqual({ ...dice0, n: dice0.n, sub: 'solid' });

  await endIt(app);
  expect(await app.run(pd => ({ sub: pd.state.substrate, polish: pd.state.polish, pending: Object.keys(pd.bag.pending).length, draft: pd.bag.active.draft, hold: pd.bag.hold }))).toEqual({ sub: 'swirl', polish: 0.93, pending: 0, draft: false, hold: null });   // the player's (now saved) design is live again
  await expect(page.locator('#cards .card', { hasText: 'Story Dice look' })).toHaveCount(0);
});

const setupStory = async app => { await app.run(pd => { pd.openGames(); }); await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); };
test('PD-187: a never-edited design is not Modified after a Story round (End game button)', async ({ app, page }) => {
  await app.open({ seed: 7, plain: true });
  await setupStory(app);
  await page.getByRole('button', { name: 'End game' }).first().click(); await page.locator('#endyes').click(); await page.waitForTimeout(1500);   // PD-192: a game in progress asks first
  expect(await app.run(pd => Object.keys(pd.bag.pending))).toEqual([]);
});
test('PD-187: Bag > Add > Blank mid-game keeps the game\'s dice and does not leak them into the new design', async ({ app, page }) => {
  await app.open({ seed: 8, plain: true });
  await setupStory(app);
  const dice = await app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length }));
  await app.run(async pd => { await pd.bagOps.addBlank(); }); await page.waitForTimeout(500);
  expect(await app.run(pd => ({ shape: pd.state.shape, notation: pd.state.notation, n: pd.dice.length }))).toEqual(dice);
  expect(await app.run(pd => pd.bag.designs[pd.bag.designs.length - 1].design.shape)).not.toBe('custom');
});
