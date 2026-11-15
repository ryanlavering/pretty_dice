// Fixes from agent playtest round 2 (PD-142.14.2.1.*): quick bar errors and modifier before adv, breakdown total, Escape and the bag sheet.
import { test, expect } from './helpers/app.mjs';

test('d20+5 adv and d20-2 dis parse like d20adv+5; adv on a non-d20 still errors (.1)', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const f = s => { const p = pd.parseNotation(s); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod); };
    return { a: f('d20+5 adv'), b: f('d20+5adv'), c: f('d20 adv+5'), d: f('D20-2 DIS'), e: f('d6+5 adv'), g: f('2d20+5 adv') };
  });
  expect(r.a).toBe('2d20kh1+5'); expect(r.b).toBe('2d20kh1+5'); expect(r.c).toBe('2d20kh1+5'); expect(r.d).toBe('2d20kl1-2');
  expect(r.e).toMatch(/^ERR/); expect(r.g).toMatch(/^ERR/);
});

test('the quick bar rolls d20+5 adv, and shows a bad formula as text, not just a red border (.1)', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  const box = page.locator('#qbar input');
  await box.fill('d20+5 adv'); await box.press('Enter');
  await expect(box).not.toHaveClass(/bad/);
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('2d20kh1+5');
  await box.fill('d20+x'); await box.press('Enter');
  await expect(box).toHaveClass(/bad/);
  await expect(page.locator('#qerr')).toBeVisible();
  await expect(page.locator('#qerr')).toContainText("Can't read");
  await box.fill('d'); await expect(page.locator('#qerr')).toBeHidden();   // typing clears it
});

test('a roll with a modifier shows "= total" in the breakdown, like 3d6 does (.4)', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  const box = page.locator('#qbar input');
  await box.fill('d20+3'); await box.press('Enter');
  const tot = page.locator('#result .tot'); await expect(tot).toBeVisible({ timeout: 30_000 });
  const brk = page.locator('#result .brk').first();
  await expect(brk).toContainText(/\+3 = \d+/, { timeout: 30_000 });
  expect(+(await tot.textContent())).toBe(+(await brk.textContent()).match(/= (\d+)/)[1]);
});

test('Escape with the bag sheet open closes only the sheet (.8)', async ({ app, page }) => {
  await app.open();
  await app.nav.openBag();
  await expect(page.locator('#bagsheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bagsheet')).toBeHidden();
  expect(await app.nav.shown('panel'), 'the settings pane stays').toBe(true);
  expect(await page.evaluate(() => document.body.classList.contains('full'))).toBe(false);
});

test('Copy in the roll log gives visible feedback that outlasts the button label (.5)', async ({ app, page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await app.open();
  await app.nav.toPlay(); await app.run(pd => { pd.simRoll(); });
  await app.nav.openLog();
  const copy = page.locator('#logpanel .lh button', { hasText: 'Copy' });
  await expect(copy).toBeEnabled(); await copy.click();
  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('#toast')).toContainText(/copied|Save/i);
  expect(await page.evaluate(() => window.__lastLogCopy)).toBeTruthy();
});

test('Enter in the Custom notation box applies the set and neither rolls nor switches to Roll mode (.9)', async ({ app, page }) => {
  await app.open();
  await app.nav.toDesign();
  await page.locator('#shapes button[data-id="custom"]').click();
  const box = page.locator('#notation');
  await box.fill('d20+4'); await box.press('Enter');
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('1d20+4');
  await page.waitForTimeout(500);
  const s = await app.run(pd => ({ rolling: !!pd.rolling, inroll: document.body.classList.contains('inroll'), rolled: pd.rollT > 0.5 }));
  expect(s.inroll, 'still in the Design room').toBe(false);
  expect(s.rolling).toBe(false);
});

test('the notation box has its own row (2d20kh1+5 is not cut off) and log header buttons stay on one line (.10)', async ({ app, page }) => {
  await app.open();
  await page.locator('#shapes button[data-id="custom"]').click();
  const box = page.locator('#notation');
  await box.fill('2d20kh1+5'); await box.press('Enter');
  const m = await page.evaluate(() => { const i = document.getElementById('notation'); return { clipped: i.scrollWidth > i.clientWidth, w: i.clientWidth }; });
  expect(m.clipped, 'full formula visible in the box').toBe(false);
  await app.nav.toPlay(); await app.run(pd => { pd.simRoll(); pd.bag.roller = 'Thorn'; });
  await app.nav.openLog();
  await app.run(pd => { pd.renderLog(); });
  const heights = await page.evaluate(() => [...document.querySelectorAll('#logpanel .le .lt button')].map(b => b.getBoundingClientRect().height));
  for (const h of heights) expect(h, 'one line each').toBeLessThan(22);
});

test('initiative: add a named entry with a score by hand, sorted among rolled rows (.6)', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  await page.evaluate(() => { document.getElementById('logpanel').hidden = false; });
  await app.run(pd => pd.renderLog());
  await page.locator('#logpanel .liopen').click();
  const name = page.locator('#logpanel .liadd input').first(), score = page.locator('#logpanel .liadd input[type=number]');
  await name.fill('Mira'); await score.fill('17'); await score.press('Enter');
  await name.fill('Thorn'); await score.fill('21'); await page.locator('#logpanel .liadd button', { hasText: 'Add' }).click();
  await score.fill(''); await page.locator('#logpanel .liadd button', { hasText: 'Add' }).click();
  await expect(score, 'a missing score is flagged, not added').toHaveClass(/bad/);
  const rows = await app.run(pd => pd.bag.init.rows.map(r => r.name + ':' + r.total));
  expect(rows).toEqual(['Thorn:21', 'Mira:17']);
  await expect(page.locator('#logpanel .lir')).toHaveCount(2);
});

test('set editor: a Save sits right under the result table box, saves the table, and the wheel scrolls the sheet (.7)', async ({ app, page }) => {
  await app.open();
  await app.nav.openBag();
  await page.locator('#sheettabs button[data-tab="sets"]').click();
  await page.locator('#setsave').click();
  const ed = page.locator('#setlist .seted');
  await expect(ed).toBeVisible();
  const tb = ed.locator('textarea.setable');
  await tb.scrollIntoViewIfNeeded();
  await tb.fill('1-10 Empty room\n11-20 Goblins');
  const save2 = ed.locator('.sesave2');
  const bt = await tb.boundingBox(), bs = await save2.boundingBox();
  expect(bs.y - (bt.y + bt.height), 'Save is directly below the table box').toBeLessThan(40);
  // wheel over the editor scrolls the sheet's list
  await page.locator('#setlist').evaluate(e => { e.scrollTop = 0; });
  const box = await page.locator('#setlist').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 60); await page.mouse.wheel(0, 300);
  await expect.poll(() => page.locator('#setlist').evaluate(e => e.scrollTop)).toBeGreaterThan(0);
  await save2.scrollIntoViewIfNeeded(); await save2.click();
  await expect(page.locator('#setlist .seted')).toHaveCount(0);
  const table = await app.run(pd => pd.bag.sets.at(-1).table);
  expect(table).toContain('Goblins');
});

test.describe('phone dock and log reach (.2 .3)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('the dock is one slim row, the settled die is not under it, and the log, + init and initiative rows can be tapped', async ({ app, page }) => {
    await app.open();
    await app.nav.toPlay();
    await app.run(pd => { pd.simRoll(); });
    const dock = await page.locator('#qbar').boundingBox();
    expect(dock.height, 'slim dock').toBeLessThan(70);
    await app.nav.openLog();
    await app.run(pd => { pd.initOps.add([{ name: 'Mira', total: 17 }]); pd.renderLog(); });
    const panel = await page.locator('#logpanel').boundingBox();
    expect(panel.y + panel.height, 'log ends above the dock').toBeLessThanOrEqual(dock.y + 2);
    for (const sel of ['#logpanel .ini', '#logpanel .lir input', '#logpanel .liopen']) {
      const loc = page.locator(sel).first(); await loc.scrollIntoViewIfNeeded();
      const hit = await loc.evaluate(e => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e === t || e.contains(t); });
      expect(hit, sel + ' is on top where it is drawn').toBe(true);
    }
  });
});

// PD-142.14.1.1.3: only kept dice count for the nat 20 / nat 1 effect.
test('a dropped nat 1 or nat 20 does not trigger the nat effect (.14.1.1.3)', async ({ shared: app }) => {
  await app.reset(1);
  const run = (notation, a, b) => app.run((pd, [notation, a, b]) => {
    pd.state.shape = 'custom'; pd.state.notation = notation; pd.buildDice(); pd.simRoll();
    pd.dice[0].labs = pd.dice[0].labs.map(() => a); pd.dice[1].labs = pd.dice[1].labs.map(() => b);   // force the faces read at rest
    pd.finishRoll();
    return { crit: pd.fx.crit.length, fumble: pd.fx.fumble.length };
  }, [notation, a, b]);
  expect(await run('2d20kh1', 20, 1), 'adv: the kept 20 counts, the dropped 1 does not').toEqual({ crit: 1, fumble: 0 });
  expect(await run('2d20kh1', 1, 20), 'adv: die 1 (the 20) is kept, the dropped 1 does not count').toEqual({ crit: 1, fumble: 0 });
  expect(await run('2d20kl1', 20, 1), 'dis: the dropped 20 does not count, the kept 1 does').toEqual({ crit: 0, fumble: 1 });
  expect(await run('2d20kh1', 1, 1), 'adv with two 1s: one is kept').toEqual({ crit: 0, fumble: 1 });
});
