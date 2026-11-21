// PD-190 (4.2 S4): the game look is a real draft (bag.hold.draft, kind 'whole'); bag.active.draft === 'game' while it is live.
// Memo scenarios S1-S16 (docs/design/game-draft-design-memo.md 4.4, adapted to bag.hold) with S12 asserting design + linked set (owner Q2).
import { test, expect } from './helpers/app.mjs';

const snap = app => app.run(pd => ({
  designs: JSON.stringify(pd.bag.designs.map(d => [d.id, d.design])), pending: JSON.stringify(pd.bag.pending), rdraft: JSON.stringify(pd.bag.draft),
  sets: JSON.stringify(pd.bag.sets), active: pd.bag.active.design, look: JSON.stringify(pd.designToJSON()) }));
const lookOf = j => { const o = JSON.parse(j); delete o.shape; delete o.notation; return JSON.stringify(o); };
const st = app => app.run(pd => ({ draft: pd.bag.active.draft, hold: pd.bag.hold ? { game: pd.bag.hold.game, phase: pd.bag.hold.phase, draft: !!pd.bag.hold.draft, name: pd.bag.hold.draft && pd.bag.hold.draft.name } : null, sub: pd.state.substrate, notation: pd.state.notation, design: pd.bag.active.design }));
async function addDesign(app, name, sub) { return app.run(async (pd, a) => { const j = pd.designToJSON(); j.substrate = a.sub; j.colors = a.cols; j.name = a.name; return pd.bagOps.addLoaded(JSON.parse(JSON.stringify(j))); }, { name, sub, cols: sub === 'swirl' ? ['#aa2233', '#33aa44', '#2233aa'] : ['#112233', '#445566', '#778899'] }); }
const pick = (app, id) => app.page.selectOption('#scorepane select >> nth=0', id);
const settle = app => app.run(pd => { pd.step(20); pd.renderOnce(); });
const toLobby = async (app, id) => { await app.nav.toPlay(); await app.run(pd => pd.openGames()); if (id) await pick(app, id); await settle(app); };
const startStory = async app => { await toLobby(app, 'story'); await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); };
const endIt = async app => { await app.run(pd => pd.endGame()); await app.page.waitForTimeout(500); };
const OWN = { shape: 'custom', notation: '3d8+1' };
const setOwn = async app => { await app.run((pd, o) => { pd.state.shape = o.shape; pd.state.notation = o.notation; pd.buildDice(); }, OWN); };
// the stored draft design follows the live look (syncLive) and differs from `then` (the look before the edit)
const draftLook = app => app.run(pd => { pd.bagToJSON(); return JSON.stringify(pd.bag.hold.draft.design); });
const liveLook = app => app.run(pd => JSON.stringify(pd.designToJSON()));
const ghost = app => app.page.locator('#cards .card[data-id="gdraft"]');

test('S1: Story selected in the lobby lists a live game draft; designs, pending and the random draft are untouched', async ({ shared: app }) => {
  await app.reset(190, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await app.run(pd => { pd.state.polish = 0.9; pd.applyLook(); }); await app.page.waitForTimeout(200);
  const before = await snap(app);
  await toLobby(app, 'story');
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { game: 'story', phase: 'lobby', draft: true, name: 'Story Dice look' }, sub: 'solid', notation: '5d12' });
  const mid = await snap(app);
  expect(mid.designs).toBe(before.designs); expect(mid.pending).toBe(before.pending); expect(mid.rdraft).toBe(before.rdraft); expect(mid.sets).toBe(before.sets); expect(mid.active).toBe(before.active);
  await expect(ghost(app)).toHaveCount(1); await expect(ghost(app)).toHaveClass(/ghost/); await expect(ghost(app)).toHaveClass(/on/);
  await expect(app.page.locator('#bagname')).toHaveText('Story Dice look');
  await expect(app.page.locator('#bagpos')).toContainText('draft for this game');
  await expect(app.page.locator('#dkeep')).toHaveText('Save as design');
  expect(await app.run(pd => document.querySelector('#bagth').style.backgroundImage !== '')).toBe(true);
});

test('S2: deselecting (another game, then leaving) leaves no draft and my design live with its pending edits and dice', async ({ shared: app }) => {
  await app.reset(191, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await app.run(pd => { pd.state.polish = 0.93; pd.applyLook(); }); await app.page.waitForTimeout(200);
  const before = await snap(app);
  await toLobby(app, 'story');
  await pick(app, 'yahtzee'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: false, hold: { game: 'yahtzee', draft: false } });   // Yacht has no look: my design is live under the Yacht dice
  expect(lookOf((await snap(app)).look)).toBe(lookOf(before.look));
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  expect(await app.run(pd => pd.bag.hold)).toBeNull();
  const after = await snap(app);
  expect(after).toEqual(before);
  expect(await app.run(pd => pd.state.notation)).toBe(OWN.notation);
  await expect(ghost(app)).toHaveCount(0);
});

test('S3: an edit in the Design room while the game draft is live goes to the draft; closing the lobby drops it and my design is back', async ({ shared: app }) => {
  await app.reset(192, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const before = await snap(app);
  await toLobby(app, 'story');
  const then = await draftLook(app);
  await app.run(pd => { pd.state.polish = 0.77; pd.applyLook(); });
  const now = await draftLook(app);
  expect(now).not.toBe(then); expect(lookOf(now)).toBe(lookOf(await liveLook(app)));   // syncLive wrote the edit to the draft
  const mid = await snap(app); expect(mid.designs).toBe(before.designs); expect(mid.pending).toBe(before.pending);
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  const after = await snap(app); expect(after).toEqual(before);
});

test('S4: Start, roll, End: my design is live again with my dice; designs, pending and random draft are as before; GSAVE removed', async ({ shared: app }) => {
  await app.reset(193, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await app.run(pd => { pd.state.polish = 0.91; pd.applyLook(); }); await app.page.waitForTimeout(200);
  const before = await snap(app);
  await startStory(app);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { phase: 'game', draft: true } });
  const mid = await snap(app); expect(mid.designs).toBe(before.designs); expect(mid.pending).toBe(before.pending);
  await endIt(app);
  expect(await snap(app)).toEqual(before);
  expect(await app.run(pd => ({ n: pd.state.notation, hold: pd.bag.hold, g: localStorage.getItem('prettydice.games.game') }))).toEqual({ n: OWN.notation, hold: null, g: null });
});

test('S5/S6: mid-game Play/Design/Play keeps the draft; edits land in it; undo never leaves the game look or dice', async ({ shared: app }) => {
  await app.reset(194, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const before = await snap(app);
  await startStory(app);
  const dice0 = await app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation }));
  const then = await draftLook(app);
  await app.nav.toDesign(); await app.run(pd => { pd.state.polish = 0.66; pd.applyLook(); }); await app.page.waitForTimeout(300);
  await app.nav.toPlay(); await settle(app);
  const now = await draftLook(app); expect(now).not.toBe(then); expect(lookOf(now)).toBe(lookOf(await liveLook(app)));
  expect(await app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation }))).toEqual(dice0);
  await app.run(async pd => { await pd.undo(); await pd.undo(); }); await app.page.waitForTimeout(300);
  expect(await app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation, sub: pd.state.substrate }))).toEqual({ ...dice0, sub: 'solid' });
  const mid = await snap(app); expect(mid.designs).toBe(before.designs); expect(mid.pending).toBe(before.pending);
});

test('S7: mid-game Save bag / Copy JSON: my design is saved from its pending edits, the file has no hold and no game draft', async ({ shared: app }) => {
  await app.reset(195, { plain: true }); const myId = await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await app.run(pd => { pd.state.polish = 0.93; pd.applyLook(); }); await app.page.waitForTimeout(200);
  const myPic = await app.run((pd, id) => { pd.bagToJSON(); return JSON.stringify(pd.bag.pending[id]); }, myId);
  await startStory(app);
  await app.run(async (pd, id) => { await pd.bagOps.save(id); }, myId);   // what Save bag does for each modified design
  const out = await app.run(pd => { const f = pd.bagFileJSON(); return { sub: f.designs.find(d => d.id === pd.bag.active.design).design.substrate, hold: f.hold, active: f.active.draft, text: JSON.stringify(f).includes('Story Dice look'), pending: Object.keys(pd.bag.pending), act: pd.bag.active.draft }; });
  expect(out.sub).toBe('swirl'); expect(out.hold).toBeUndefined(); expect(out.active).toBe(false); expect(out.text).toBe(false);
  expect(out.act).toBe('game');
  expect(await app.run((pd, id) => JSON.stringify(pd.bag.designs.find(d => d.id === id).design), myId)).toBe(myPic);
});

test('S8: mid-game pick of B: look B, game dice kept, the ghost stays listed; picking the ghost brings the plain look and its edits back', async ({ shared: app }) => {
  await app.reset(196, { plain: true }); const mineId = await addDesign(app, 'Mine', 'swirl'); const otherId = await addDesign(app, 'Other', 'metal');
  await app.run(async (pd, id) => { await pd.bagActivate(id); }, mineId); await app.page.waitForTimeout(300);
  await setOwn(app);
  await startStory(app);
  await app.run(pd => { pd.state.polish = 0.55; pd.applyLook(); });
  const edited = await liveLook(app);
  await app.run(async (pd, id) => { await pd.bagActivate(id); }, otherId); await app.page.waitForTimeout(500);
  expect(await st(app)).toMatchObject({ draft: false, hold: { draft: true }, sub: 'metal', notation: '5d12', design: otherId });
  await expect(ghost(app)).toHaveCount(1); await expect(ghost(app)).not.toHaveClass(/\bon\b/);
  await app.run(async pd => { await pd.bagActivate('gdraft'); }); await app.page.waitForTimeout(500);   // what a tap on the ghost does
  expect(await st(app)).toMatchObject({ draft: 'game', sub: 'solid', notation: '5d12' });
  expect(lookOf(await liveLook(app))).toBe(lookOf(edited));
});

test('S9: mid-game pick of B, End: B stays (D1), my design untouched, the draft is gone', async ({ shared: app }) => {
  await app.reset(197, { plain: true }); const mineId = await addDesign(app, 'Mine', 'swirl'); const otherId = await addDesign(app, 'Other', 'metal');
  await app.run(async (pd, id) => { await pd.bagActivate(id); }, mineId); await app.page.waitForTimeout(300); await setOwn(app);
  const pre = await snap(app);
  await startStory(app);
  await app.run(async (pd, id) => { await pd.bagActivate(id); }, otherId); await app.page.waitForTimeout(500);
  await endIt(app);
  const post = await snap(app);
  expect(post.designs).toBe(pre.designs); expect(post.pending).toBe(pre.pending); expect(post.active).toBe(otherId);
  expect(await app.run(pd => ({ sub: pd.state.substrate, n: pd.state.notation, hold: pd.bag.hold }))).toEqual({ sub: 'metal', n: OWN.notation, hold: null });
});

test('S10: mid-game Randomize: the random draft is live and stays after End; the game draft stays listed meanwhile; my design is untouched', async ({ shared: app }) => {
  await app.reset(198, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const pre = await snap(app);
  await startStory(app);
  await app.run(pd => pd.randomize()); await app.page.waitForTimeout(400);
  expect(await st(app)).toMatchObject({ draft: true, hold: { draft: true } });
  await expect(ghost(app)).toHaveCount(1);
  await endIt(app);
  expect(await app.run(pd => ({ d: pd.bag.active.draft, hold: pd.bag.hold, n: pd.state.notation }))).toEqual({ d: true, hold: null, n: OWN.notation });
  expect((await snap(app)).designs).toBe(pre.designs);
});

test('S11: mid-game a set with other dice is declined; a same-dice set is accepted', async ({ shared: app }) => {
  await app.reset(199, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const tw = await app.run(pd => pd.setOps.create({ name: 'Twenties', terms: [{ count: 5, sides: 20 }], mod: 0 }));
  await startStory(app);
  await app.run((pd, id) => pd.setOps.open(id), tw); await app.page.waitForTimeout(200);
  expect(await app.run(pd => pd.state.notation)).toBe('5d12');
  expect(await app.run(pd => pd.bag.active.set)).not.toBe(tw);
});

test('S12: Save as design on the ghost makes a design (look = the draft, suggestion = the game dice) AND a set naming it; the game goes on; End keeps the new design', async ({ shared: app }) => {
  await app.reset(200, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const preDesigns = await app.run(pd => pd.bag.designs.length), preSets = await app.run(pd => pd.bag.sets.length);
  await startStory(app);
  const dice0 = await app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation }));
  await app.run(async pd => { await pd.bagOps.keep(); }); await app.page.waitForTimeout(400);   // the Bag header's Save as design button
  const o = await app.run(pd => { const d = pd.bag.designs[pd.bag.designs.length - 1], s = pd.bag.sets[pd.bag.sets.length - 1]; return { nd: pd.bag.designs.length, ns: pd.bag.sets.length, name: d.name, sub: d.design.substrate, shape: d.design.shape, notation: d.design.notation, active: pd.bag.active, hold: pd.bag.hold && { draft: pd.bag.hold.draft, phase: pd.bag.hold.phase, mine: pd.bag.hold.mine }, setName: s.name, setDesign: s.design, id: d.id, term: s.terms[0], dice: pd.dice.length, live: pd.state.notation }; });
  expect(o.nd).toBe(preDesigns + 1); expect(o.ns).toBe(preSets + 1);
  expect(o).toMatchObject({ name: 'Story Dice look', sub: 'solid', shape: 'custom', notation: '5d12', setName: 'Story Dice dice' });
  expect(o.setDesign).toBe(o.id); expect(o.term).toMatchObject({ count: 5, sides: 12, design: o.id }); expect(o.term.faces).toBeTruthy();
  expect(o.active).toMatchObject({ design: o.id, draft: false }); expect(o.hold.draft).toBeNull(); expect(o.hold.phase).toBe('game'); expect(o.hold.mine).toMatchObject(OWN);
  expect({ n: o.dice, notation: o.live }).toEqual({ n: dice0.n, notation: dice0.notation });
  await endIt(app);
  expect(await app.run(pd => ({ a: pd.bag.active.design, n: pd.state.notation, sub: pd.state.substrate }))).toEqual({ a: o.id, n: OWN.notation, sub: 'solid' });
});

test('S12b: Save as design from the lobby (draft not started); name clashes get a number and never overwrite', async ({ shared: app }) => {
  await app.reset(201, { plain: true }); const clash = await addDesign(app, 'Story Dice look', 'swirl'); await setOwn(app);
  const pre = await app.run(pd => ({ d: pd.bag.designs.map(d => d.id), s: pd.bag.sets.map(x => x.id) }));
  await toLobby(app, 'story');
  await app.run(async pd => { await pd.bagOps.keepGame(); });
  const o = await app.run((pd, pre) => ({ nd: pd.bag.designs.filter(d => !pre.d.includes(d.id)).map(d => d.name), ns: pd.bag.sets.filter(x => !pre.s.includes(x.id)).map(x => x.name), hold: pd.bag.hold && pd.bag.hold.draft }), pre);
  expect(o.nd.length).toBe(1); expect(o.nd[0]).toMatch(/^Story Dice look \d+$/); expect(o.nd[0]).not.toBe(await app.run((pd, id) => pd.bag.designs.find(d => d.id === id).name, clash));
  expect(o.ns).toHaveLength(1); expect(o.ns[0]).toMatch(/^Story Dice dice( \d+)?$/); expect(o.hold).toBeNull();
  expect(await app.run((pd, id) => pd.bag.designs.find(d => d.id === id).design.substrate, clash)).toBe('swirl');   // the clashing design is not overwritten
});

test('S13: reload mid-game: my design is live with my dice, the ghost is listed; Resume brings the draft back with its edits; End as S4', async ({ app }) => {
  await app.open({ seed: 202, plain: true });
  await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await app.run(pd => { pd.state.polish = 0.93; pd.applyLook(); }); await app.page.waitForTimeout(300);
  const mineLook = await liveLook(app);
  await startStory(app);
  await app.run(pd => { pd.state.polish = 0.55; pd.applyLook(); }); await app.page.waitForTimeout(300);
  const draftEdited = await liveLook(app);
  await app.run(pd => pd.bagToJSON());
  const before = await app.run(pd => JSON.stringify(pd.bag.designs.map(d => d.design)) + JSON.stringify(pd.bag.pending));
  await app.page.reload(); await app.ready();
  expect(await st(app)).toMatchObject({ draft: false, hold: { game: 'story', phase: 'lobby', draft: true }, sub: 'swirl', notation: OWN.notation, design: 'mine' });
  expect(lookOf(await liveLook(app))).toBe(lookOf(mineLook));   // my own edits (pending), not the game look
  await expect(ghost(app)).toHaveCount(1); await expect(ghost(app)).not.toHaveClass(/\bon\b/);
  await app.run(pd => pd.openGames());
  await app.page.click('#scorepane button:has-text("Resume")');
  await app.page.waitForTimeout(600);
  expect(await st(app)).toMatchObject({ draft: 'game', sub: 'solid', notation: '5d12' });
  expect(lookOf(await liveLook(app))).toBe(lookOf(draftEdited));   // the pre-reload draft edit
  await endIt(app);
  expect(await app.run(pd => JSON.stringify(pd.bag.designs.map(d => d.design)) + JSON.stringify(pd.bag.pending))).toBe(before);
  expect(await app.run(pd => ({ n: pd.state.notation, hold: pd.bag.hold, d: pd.bag.active.draft, sub: pd.state.substrate }))).toEqual({ n: OWN.notation, hold: null, d: false, sub: 'swirl' });
  expect(lookOf(await liveLook(app))).toBe(lookOf(mineLook));
});

test('S14: reload with a stale lobby draft (no saved game): boot drops it and my design is live with my dice', async ({ app }) => {
  await app.open({ seed: 203, plain: true });
  await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await app.run(pd => { pd.state.polish = 0.93; pd.applyLook(); }); await app.page.waitForTimeout(300);
  const mineLook = await liveLook(app);
  await toLobby(app, 'story');
  await app.run(pd => { localStorage.setItem('prettydice.bag.v1', JSON.stringify(pd.bagToJSON())); });
  await app.page.reload(); await app.ready();
  expect(await st(app)).toMatchObject({ draft: false, hold: null, sub: 'swirl', notation: OWN.notation, design: 'mine' });
  expect(lookOf(await liveLook(app))).toBe(lookOf(mineLook));
  expect(await app.run(pd => Object.keys(pd.bag.pending).length)).toBe(1);
  await expect(ghost(app)).toHaveCount(0);
  const stored = await app.run(() => JSON.parse(localStorage.getItem('prettydice.v1')));
  expect(stored.substrate).toBe('swirl');   // the settings store holds my look again, not the game's
});

test('S15: End, then Games still showing Story: a fresh draft (no old edits); closing releases as S2', async ({ shared: app }) => {
  await app.reset(204, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const before = await snap(app);
  await startStory(app);
  await app.run(pd => { pd.state.polish = 0.5; pd.applyLook(); });
  const edited = await draftLook(app);
  await endIt(app); await settle(app);
  const o = await app.run(pd => ({ hold: pd.bag.hold && pd.bag.hold.phase, d: pd.bag.hold && pd.bag.hold.draft ? JSON.stringify(pd.bag.hold.draft.design) : null }));
  if (o.d) expect(o.d).not.toBe(edited);   // PD-191: Story is still selected: a fresh lobby draft, not the old edits
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  expect(await snap(app)).toEqual(before);
});

test('S16: Yacht creates no draft, in the lobby or in the round', async ({ shared: app }) => {
  await app.reset(205, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  const before = await snap(app);
  await toLobby(app, 'yahtzee');
  expect(await app.run(pd => ({ d: pd.bag.active.draft, h: pd.bag.hold.draft }))).toEqual({ d: false, h: null });
  await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 }));
  expect(await app.run(pd => ({ d: pd.bag.active.draft, h: pd.bag.hold.draft }))).toEqual({ d: false, h: null });
  await expect(ghost(app)).toHaveCount(0);
  await endIt(app);
  expect(await snap(app)).toEqual(before);
});

test('Discard on the ghost = use my design (look only, game dice kept); the draft does not come back on a re-key', async ({ shared: app }) => {
  await app.reset(206, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await toLobby(app, 'story');
  await app.run(async pd => { await pd.bagOps.discard(); }); await app.page.waitForTimeout(300);
  expect(await st(app)).toMatchObject({ draft: false, hold: { draft: false }, sub: 'swirl', notation: '5d12' });
  await expect(ghost(app)).toHaveCount(0);
  // another game and back brings a fresh draft
  await pick(app, 'yahtzee'); await settle(app); await pick(app, 'story'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { draft: true } });
});

test('Rename on the ghost renames the draft (the ghost menu itself is asserted in story-draft-design)', async ({ shared: app }) => {
  await app.reset(207, { plain: true }); await addDesign(app, 'Mine', 'swirl'); await setOwn(app);
  await toLobby(app, 'story');
  await app.run(pd => pd.bagOps.rename('gdraft', 'My story look'));
  expect(await app.run(pd => pd.bag.hold.draft.name)).toBe('My story look');
});
