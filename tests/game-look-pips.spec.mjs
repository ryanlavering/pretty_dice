// PD-188 (4.2 S5): Yacht "Use d6 pips" is a tweak game look: the player's design plus d6 pips, a draft in bag.hold.draft (kind 'tweak').
import { test, expect } from './helpers/app.mjs';

const st = app => app.run(pd => ({ draft: pd.bag.active.draft, hold: pd.bag.hold ? { game: pd.bag.hold.game, phase: pd.bag.hold.phase, kind: pd.bag.hold.draft && pd.bag.hold.draft.kind, name: pd.bag.hold.draft && pd.bag.hold.draft.name, base: pd.bag.hold.draft && pd.bag.hold.draft.base } : null, d6: pd.state.d6Style, design: pd.bag.active.design, notation: pd.state.notation }));
const clearPrefs = app => app.run(pd => { for (const k of Object.keys(pd.gprefs.opts)) if (k.endsWith('.look')) delete pd.gprefs.opts[k]; });
async function addDesign(app, name, sub, d6) { return app.run(async (pd, a) => { const j = pd.designToJSON(); j.substrate = a.sub; j.name = a.name; j.numbers = { ...j.numbers, d6_style: a.d6 }; return pd.bagOps.addLoaded(JSON.parse(JSON.stringify(j))); }, { name, sub, d6 }); }
const pick = (app, id) => app.page.selectOption('#scorepane select >> nth=0', id);
const settle = app => app.run(pd => { pd.step(20); pd.renderOnce(); });
const toLobby = async (app, id) => { await app.nav.toPlay(); await app.run(pd => pd.openGames()); if (id) await pick(app, id); await settle(app); };
const endIt = async app => { await app.run(pd => pd.endGame()); await app.page.waitForTimeout(500); };
const ghost = app => app.page.locator('#cards .card[data-id="gdraft"]');
const useBagActivate = async (app, id) => { await app.nav.openBag(); await app.page.locator(`#tiles .tile[data-id="${id}"]`).click(); await app.page.waitForTimeout(800); };
// the seeded boot look has random pips/numbers: start from a known numbers design
const baseNumbers = async app => { const id = await addDesign(app, 'Base', 'solid', 'numbers'); await useBagActivate(app, id); return id; };

test('lobby: Yacht shows "<A> pips" live by default; the toggle drops it and brings it back', async ({ shared: app }) => {
  await app.reset(188, { plain: true }); await clearPrefs(app);
  const a = await baseNumbers(app);
  const pend0 = await app.run(pd => Object.keys(pd.bag.pending));   // the shared page may carry other tests' pending edits: assert only on what this test adds
  await toLobby(app, 'yahtzee');
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { game: 'yahtzee', phase: 'lobby', kind: 'tweak', base: a }, d6: 'pips', notation: '5d6' });
  expect((await st(app)).hold.name).toMatch(/ pips$/);
  await expect(ghost(app)).toHaveCount(1);
  await expect(app.page.locator('#bagpos')).toContainText('draft for this game');
  await expect(app.page.locator('#gamelook')).toBeChecked();
  await app.page.uncheck('#gamelook'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: false, hold: { game: 'yahtzee', kind: null }, d6: 'numbers' });
  await expect(ghost(app)).toHaveCount(0);
  await app.page.check('#gamelook'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak' }, d6: 'pips' });
  expect(await app.run(pd => Object.keys(pd.bagToJSON().pending))).toEqual(pend0);   // never Modified: no pending entry added (none for the base design)
  await expect(app.page.locator('#modbadge')).toBeHidden();
});

test('other d6 games offer the toggle, off by default; Story does not', async ({ shared: app }) => {
  await app.reset(189, { plain: true }); await clearPrefs(app); await baseNumbers(app);
  await toLobby(app, 'farkle');
  await expect(app.page.locator('#gamelook')).not.toBeChecked();
  expect(await st(app)).toMatchObject({ draft: false, hold: { kind: null }, d6: 'numbers' });
  await app.page.check('#gamelook'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak' }, d6: 'pips' });
  await pick(app, 'story'); await settle(app);
  await expect(app.page.locator('#gamelook')).toHaveCount(0);
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: false, hold: null, d6: 'numbers' });
});

test('pick B mid-game -> B + pips; End game -> B; the pick in the lobby follows too', async ({ shared: app }) => {
  await app.reset(190, { plain: true }); await clearPrefs(app); const b = await addDesign(app, 'Bee', 'swirl', 'numbers');
  await baseNumbers(app);
  await toLobby(app, 'yahtzee');
  await app.nav.roll(); await app.run(pd => pd.startGame('yahtzee', ['P1'], {}, [])); await app.page.waitForTimeout(300);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { phase: 'game', kind: 'tweak' }, d6: 'pips' });
  const before = await app.run(pd => Object.keys(pd.bag.pending));
  await useBagActivate(app, b);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak', name: 'Bee pips', base: b }, d6: 'pips', design: b });
  expect(await app.run(pd => pd.state.substrate)).toBe('swirl');
  expect(await app.run(pd => Object.keys(pd.bag.pending))).toEqual(before);
  await endIt(app);
  expect(await st(app)).toMatchObject({ draft: false, hold: null, d6: 'numbers', design: b });
  expect(await app.run(pd => pd.state.substrate)).toBe('swirl');
});

test('lobby pick B: draft rebuilt as B + pips and listed; leaving restores B', async ({ shared: app }) => {
  await app.reset(191, { plain: true }); await clearPrefs(app); const b = await addDesign(app, 'Lobbee', 'swirl', 'numbers'); await baseNumbers(app);
  await toLobby(app, 'yahtzee');
  await useBagActivate(app, b);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { name: 'Lobbee pips', base: b }, d6: 'pips', design: b });
  await app.page.click('#paneltabs [data-pane=table]'); await settle(app);
  expect(await st(app)).toMatchObject({ draft: false, hold: null, d6: 'numbers', design: b });
});

test('base design already pips -> no draft; picking a numbers design then rebuilds one', async ({ shared: app }) => {
  await app.reset(192, { plain: true }); await clearPrefs(app); const p = await addDesign(app, 'Dots', 'swirl', 'pips'); const n = await addDesign(app, 'Nums', 'solid', 'numbers');
  await useBagActivate(app, p);
  await toLobby(app, 'yahtzee');
  expect(await st(app)).toMatchObject({ draft: false, hold: { game: 'yahtzee', kind: null }, d6: 'pips', design: p });
  await expect(ghost(app)).toHaveCount(0);
  await useBagActivate(app, n);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak', name: 'Nums pips', base: n }, d6: 'pips' });
  await useBagActivate(app, p);
  expect(await st(app)).toMatchObject({ draft: false, hold: { kind: null }, d6: 'pips', design: p });
});

test('Save as design keeps B+pips as a design; Discard goes back to my design', async ({ shared: app }) => {
  await app.reset(193, { plain: true }); await clearPrefs(app); await baseNumbers(app);
  await toLobby(app, 'yahtzee');
  await app.run(async pd => { await pd.bagOps.discard(); }); await settle(app);
  expect(await st(app)).toMatchObject({ draft: false, d6: 'numbers' });
  await app.page.uncheck('#gamelook'); await app.page.check('#gamelook'); await settle(app);   // a toggle round trip brings the draft back after Discard
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak' }, d6: 'pips' });
  const n0 = await app.run(pd => pd.bag.designs.length);
  await app.run(async pd => { await pd.bagOps.keepGame(); }); await settle(app);
  const r = await app.run(pd => ({ n: pd.bag.designs.length, last: pd.bag.designs[pd.bag.designs.length - 1], draft: pd.bag.active.draft }));
  expect(r.n).toBe(n0 + 1); expect(r.last.name).toMatch(/ pips$/); expect(r.last.design.numbers.d6_style).toBe('pips'); expect(r.draft).toBe(false);
});

test('GSAVE look + resume keeps the toggle across a reload (on and off)', async ({ app }) => {
  await app.open({ seed: 194, plain: true }); await baseNumbers(app);
  await toLobby(app, 'yahtzee');
  await app.page.uncheck('#gamelook'); await settle(app);
  await app.nav.roll(); await app.run(pd => pd.startGame('yahtzee', ['P1'], {}, [])); await app.page.waitForTimeout(300);
  expect(await app.run(pd => pd.game.look)).toBe(false);
  await app.run(pd => pd.gsaveGame && pd.gsaveGame());
  expect(await app.run(() => JSON.parse(localStorage.getItem('prettydice.games.game')).look)).toBe(false);
  await app.page.reload(); await app.ready();
  await app.nav.toPlay(); await app.run(pd => pd.openGames()); await settle(app);
  await app.page.click('#scorepane button:has-text("Resume")'); await app.page.waitForTimeout(500);
  expect(await st(app)).toMatchObject({ draft: false, d6: 'numbers' });
  expect(await app.run(pd => pd.game.look)).toBe(false);
  await endIt(app);
  // on: restart with the toggle on
  await app.run(pd => { pd.gprefs.opts['yahtzee.look'] = true; });
  await toLobby(app, 'yahtzee');
  await app.nav.roll(); await app.run(pd => pd.startGame('yahtzee', ['P1'], {}, [])); await app.page.waitForTimeout(300);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak' }, d6: 'pips' });
  await app.run(pd => pd.gsaveGame && pd.gsaveGame());
  expect(await app.run(() => JSON.parse(localStorage.getItem('prettydice.games.game')).look)).toBe(true);
  await app.page.reload(); await app.ready();
  expect(await st(app)).toMatchObject({ draft: false, d6: 'numbers' });
  await app.run(pd => pd.openGames()); await settle(app);
  await app.page.click('#scorepane button:has-text("Resume")'); await app.page.waitForTimeout(600);
  expect(await st(app)).toMatchObject({ draft: 'game', hold: { phase: 'game', kind: 'tweak' }, d6: 'pips' });
  await endIt(app);
  expect(await st(app)).toMatchObject({ draft: false, hold: null, d6: 'numbers' });
});

// owner review: "create a few draft designs and Keep them. Selecting one of those designs can lose the pips"
const keepRandom = async (app, seed, d6) => app.run(async (pd, a) => { pd.randomize(); pd.state.d6Style = a.d6; pd.applyLook(); await pd.bagOps.keep('random'); return pd.bag.active.design; }, { d6 });
const keepBlank = async app => { await app.nav.openBag(); await app.run(() => document.querySelector('#tiles .plus, #shelf .plus, #shelf .card.plus')?.click()); await app.page.locator('#cardmenu button', { hasText: 'Blank draft' }).click(); await app.page.waitForTimeout(300);
  await app.run(async pd => { await pd.bagOps.keep('random'); }); await app.page.waitForTimeout(300); return app.run(pd => pd.bag.active.design); };
const expectPips = async (app, id, why) => {
  const s = await st(app);
  expect(s.d6, why).toBe('pips');
  expect(s, why).toMatchObject({ draft: 'game', design: id, hold: { kind: 'tweak', base: id } });
};
for (const where of ['lobby', 'mid-game']) for (const game of ['yahtzee', 'farkle', 'pig']) {
  test(`pips survive picking kept draft designs (${game}, ${where})`, async ({ shared: app }) => {
    await app.reset(300, { plain: true }); await clearPrefs(app); await baseNumbers(app);
    await app.run((pd, g) => { pd.gprefs.opts[g + '.look'] = true; }, game);
    await toLobby(app, game);
    if (where === 'mid-game') { await app.nav.roll(); await app.run((pd, g) => pd.startGame(g, ['P1'], {}, []), game); await app.page.waitForTimeout(300); }
    expect(await st(app)).toMatchObject({ draft: 'game', hold: { kind: 'tweak' }, d6: 'pips' });
    const ids = [];
    for (const d6 of ['numbers', 'pips', 'blank', 'numbers']) {
      ids.push(d6 === 'blank' ? await keepBlank(app) : await keepRandom(app, 0, d6));   // a random draft (live over the game look), kept: the kept design is now the pick
      if (where === 'lobby') await settle(app);
    }
    for (const id of [...ids, ...ids.slice().reverse()]) {
      await useBagActivate(app, id);
      const s = await st(app); expect(s.d6, `d6 after picking ${id}`).toBe('pips');
      if (await app.run((pd, i) => pd.bag.designs.find(d => d.id === i).design.numbers.d6_style, id) === 'pips') expect(s.hold.kind, 'base already pips: no draft').toBeNull();
      else await expectPips(app, id, `pick ${id}`);
    }
  });
}

test('pips survive: a random draft live over the pips draft, then a design pick', async ({ shared: app }) => {
  await app.reset(301, { plain: true }); await clearPrefs(app); const base = await baseNumbers(app); const b = await addDesign(app, 'Pickme', 'swirl', 'numbers');
  await toLobby(app, 'yahtzee');
  await app.run(pd => { pd.randomize(); }); await settle(app);
  expect(await st(app)).toMatchObject({ draft: true });
  await useBagActivate(app, b); await expectPips(app, b, 'pick over a live random draft');
  await app.run(pd => { pd.randomize(); }); await settle(app);
  await useBagActivate(app, base); await expectPips(app, base, 'pick base over a live random draft');
});

test('pips survive: Save as design on the pips draft, then picks follow again', async ({ shared: app }) => {
  await app.reset(302, { plain: true }); await clearPrefs(app); const base = await baseNumbers(app); const b = await addDesign(app, 'Pickme2', 'swirl', 'numbers');
  await toLobby(app, 'yahtzee');
  await app.run(async pd => { await pd.bagOps.keepGame(); }); await settle(app);
  const saved = await app.run(pd => pd.bag.active.design);
  await useBagActivate(app, b); await expectPips(app, b, 'pick after Save as design');
  await useBagActivate(app, base); await expectPips(app, base, 'pick base after Save as design');
  expect(saved).not.toBe(base);
});
