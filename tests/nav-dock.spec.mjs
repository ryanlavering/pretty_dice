// Navigation slice 2 (PD-142.38): the dock = a formula box and the one gold Roll button (#rollbtn).
// Die chips, Adv/Dis and saved-set chips sit in the panel (#dicechips) and only load; nothing but the dock throws in roll view.
import { test, expect } from './helpers/app.mjs';

const SETUP = async pd => {
  const mk = (shape, substrate, name) => ({ ...pd.designToJSON(), shape, substrate, name });
  await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'Test bag', designs: [
    { id: 'bone', name: 'Bone', design: mk('d6', 'solid', 'Bone') }],
  sets: [{ id: 'dmg', name: 'Damage', terms: [{ count: 2, sides: 6, design: 'bone' }, { count: 1, sides: 8 }], mod: 3 }],
  active: { design: 'bone' } }, { replace: true });
};
const SIZES = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
// the shared page does not step physics by itself: a throw leaves settled=false until pd.step() runs it out
const settle = app => app.run(pd => { pd.step(1500); return pd.settled; });
const st = app => app.run(pd => ({ n: pd.state.notation, dice: pd.dice.length, rolling: pd.rolling, settled: pd.settled, placed: pd.placed, set: pd.bag.active.set, box: document.getElementById('rollbox').value, ph: document.getElementById('rollbox').placeholder }));
const toRoll = async app => { await app.nav.toPlay(); expect(await settle(app)).toBe(true); await app.page.locator('#rollbox').fill(''); };   // the box keeps its text after a roll (PD-142.14.1.6.2) and the shared page carries it over, so start empty

test.beforeEach(async ({ shared }) => { await shared.reset(7); await shared.run(SETUP); });
test.afterAll(async ({ shared }) => { await shared.page.setViewportSize({ width: 1280, height: 720 }); });

for (const [name, vp] of Object.entries(SIZES)) {
  test(`${name}: in roll view exactly one visible control throws, the dock's Roll button`, async ({ shared: app }) => {
    await app.page.setViewportSize(vp); await toRoll(app);
    await expect(app.page.locator('#qbar')).toBeVisible();
    expect(await app.page.locator('#qbar > input, #qbar > button:not(.dchip)').evaluateAll(k => k.map(e => e.id)), 'the dock is a box and a button').toEqual(['rollbox', 'rollbtn']);
    const dock = await app.page.locator('#qbar').boundingBox();
    expect(dock.x).toBeGreaterThanOrEqual(0); expect(dock.x + dock.width).toBeLessThanOrEqual(vp.width);
    // every candidate: the dock, the panel switch's Roll half, each chip
    const ids = await app.page.evaluate(() => [...document.querySelectorAll('#qbar button, #roll, #dicechips button')].map((b, i) => { b.dataset.cand = i; return { i, label: b.id || b.textContent, vis: !!b.offsetParent }; }));
    const throwers = []; let seen = 0;
    for (const c of ids) {
      const b = app.page.locator(`[data-cand="${c.i}"]`);
      if (!(await b.count()) || !(await b.isVisible())) continue;   // set chips reopen the chip list: re-tagged below
      seen++; await b.click();
      if (!(await app.run(pd => pd.settled))) { throwers.push(c.label); await settle(app); }
      await app.page.evaluate(() => [...document.querySelectorAll('#qbar button, #roll, #dicechips button')].forEach((b, i) => { b.dataset.cand = i; }));
    }
    expect(throwers).toEqual(['rollbtn']);
    if (name === 'desktop') expect(seen, 'dock, switch, 7 dice, Adv, Dis, one set, in the panel and again in the dock').toBeGreaterThanOrEqual(12);
  });
}

test('a die chip loads the box and does not throw; Adv replaces the box with d20adv; Enter throws the box', async ({ shared: app }) => {
  await app.page.setViewportSize(SIZES.desktop); await toRoll(app);
  const before = await st(app);
  const chip = async sel => { await app.page.locator(`#qbar .dchip${sel}`).click(); await app.page.waitForTimeout(350); };   // a single tap waits ~250 ms for a double-click (.38.40)
  const add = async sel => { await app.page.waitForTimeout(500); await app.page.locator(`#qbar .dchip${sel}`).dblclick(); };   // PD-142.38.11: a tap replaces the box, a double-click adds one
  await chip('[data-die="20"]'); expect((await st(app)).box).toBe('1d20');
  await chip('[data-die="20"]'); expect((await st(app)).box, 'a second tap replaces, it does not add').toBe('1d20');
  await add('[data-die="20"]'); expect((await st(app)).box).toBe('2d20');
  await add('[data-die="6"]'); expect((await st(app)).box).toBe('2d20+1d6');
  await add('[data-die="100"]'); expect((await st(app)).box).toBe('2d20+1d6+1d%');
  await chip('[data-die="8"]'); expect((await st(app)).box, 'a tap replaces the whole formula').toBe('1d8');
  await app.page.locator('#rollbox').fill('1d20+1d6+2');
  await chip('[data-adv="h"]'); expect((await st(app)).box, 'PD-142.38.46: a tap on Adv replaces the box with d20adv').toBe('2d20kh1');
  await chip('[data-adv="l"]'); expect((await st(app)).box).toBe('2d20kl1');
  expect(await st(app), 'loading never throws or changes the dice on the mat').toMatchObject({ n: before.n, dice: before.dice, settled: true });
  await app.page.locator('#rollbox').press('Enter');
  expect(await st(app)).toMatchObject({ n: '2d20kl1', dice: 2, settled: false, box: '2d20kl1', ph: '2d20kl1' });   // the text stays in the box after a roll (PD-142.14.1.6.2)
  await settle(app);
  // a formula that does not parse marks the box and changes nothing
  await app.page.locator('#rollbox').fill('banana'); await app.page.locator('#rollbtn').click();
  await expect(app.page.locator('#rollbox')).toHaveClass(/bad/);
  expect(await st(app)).toMatchObject({ n: '2d20kl1', settled: true });
  await app.page.locator('#rollbox').fill('');
});

test('R, Enter in an empty box and the button all throw the dice on the mat; the panel switch does not', async ({ shared: app }) => {
  await app.page.setViewportSize(SIZES.desktop); await toRoll(app);
  const n = (await st(app)).n;
  await app.page.locator('#rollbtn').click(); expect(await st(app)).toMatchObject({ settled: false, n }); await settle(app);
  await app.page.locator('#rollbox').press('Enter'); expect(await st(app)).toMatchObject({ settled: false, n }); await settle(app);
  await app.page.locator('#stage').click({ position: { x: 5, y: 5 } }); await app.page.keyboard.press('r'); expect(await st(app)).toMatchObject({ settled: false, n }); await settle(app);
  await app.page.locator('#roll').click(); expect(await st(app), 'the Roll half of the panel switch is a pure switch in roll view').toMatchObject({ settled: true, rolling: true });
  // R with a formula in the box throws that formula, the same as the button
  await app.page.locator('#rollbox').fill('3d6+2'); await app.page.locator('#stage').click({ position: { x: 5, y: 5 } }); await app.page.keyboard.press('r');
  expect(await st(app)).toMatchObject({ n: '3d6+2', dice: 3, settled: false, box: '3d6+2' });
  await settle(app);
});

test('a saved set chip and the set menu "Open" load the set on the mat without throwing; Roll then throws it', async ({ shared: app }) => {
  await app.page.setViewportSize(SIZES.desktop); await toRoll(app);
  await app.page.locator('#qbar .dchip[data-set="dmg"]').click();
  expect(await st(app)).toMatchObject({ n: '2d6@bone+1d8+3', dice: 3, set: 'dmg', placed: true, settled: true, ph: '2d6@bone+1d8+3 · Damage' });
  await app.page.locator('#rollbtn').click();
  expect(await st(app)).toMatchObject({ set: 'dmg', placed: false, settled: false }); await settle(app);
  // from the bag sheet: the set menu has one "Open" (was "Open and roll now")
  await app.nav.toDesign(); await app.nav.openBag(); await app.page.locator('#sheettabs [data-tab="sets"]').click();
  await app.page.locator('#setlist .setrow[data-id="dmg"] .dots').click();
  await expect(app.page.locator('#cardmenu')).not.toContainText('roll now');
  await app.page.locator('#cardmenu >> text=/^Open$/').click();
  expect(await st(app)).toMatchObject({ rolling: true, placed: true, settled: true, set: 'dmg' });
});

// PD-142.38.47: the dock box and the Design Custom set are one formula across room switches.
test('Design Custom edits (Adv, dice +/-, modifier, shape) reach the dock box, and a Play formula reaches the Custom set (.38.47)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay();
  const box = page.locator('#rollbox');
  await box.fill('d20'); await page.waitForTimeout(100);
  await app.nav.toDesign(); await page.waitForTimeout(300);
  expect(await app.run(pd => pd.state.shape), 'Play d20 reaches the design').toBe('d20');
  await page.locator('#shapes button[data-id=custom]').dblclick(); await page.waitForTimeout(300);
  await page.locator('#notadv').click(); await page.waitForTimeout(500);
  expect(await app.run(pd => pd.state.notation)).toMatch(/2d20kh1/);
  await app.nav.toPlay(); await expect(box, 'Custom Adv in Design shows in the dock box').toHaveValue('2d20kh1');
  // the other Custom edits
  await app.nav.toDesign(); await page.locator('#modp').click(); await page.locator('#steppers [data-n="6"] ~ .sc button[data-d="1"], #steppers .step:has([data-n="6"]) button[data-d="1"]').first().click();
  const f = await app.run(pd => pd.state.notation); expect(f).toMatch(/\+1/);
  await app.nav.toPlay(); await expect(box, 'dice +/- and modifier in Design show in the dock').toHaveValue(f);
  // reverse: typed in Play, then Design
  await box.fill('3d8+2'); await app.nav.toDesign();
  expect(await app.run(pd => pd.state.notation), 'Play formula reaches the Custom set').toBe('3d8+2');
  await expect(page.locator('#notation')).toHaveValue('3d8+2');
  await app.nav.toPlay(); await expect(box).toHaveValue('3d8+2');
});

// PD-142.38.48: a double-click on a dock chip adds one die however it arrives: a real dblclick, two quick clicks with no dblclick (touch), or a slow double-click.
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
  test(`${name}: dock chips add on a double-click, two quick clicks and a slow double-click, for the same and a different chip (.38.48)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toPlay(); await page.waitForTimeout(500);
    const box = page.locator('#rollbox'), chip = n => page.locator(`#qbar .dchip[data-die="${n}"]`);
    const fire = (n, gap, withDbl) => page.evaluate(async ([n, gap, withDbl]) => { const b = document.querySelector(`#qbar .dchip[data-die="${n}"]`), ev = (t, d) => b.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, detail: d }));
      ev('click', 1); await new Promise(r => setTimeout(r, gap)); ev('click', 2); if (withDbl) ev('dblclick', 2); }, [n, gap, withDbl]);
    const set = async v => { await page.waitForTimeout(400); await box.fill(v); await page.waitForTimeout(300); };
    await chip(20).scrollIntoViewIfNeeded();
    for (const [start, n, want] of [['1d20', 20, '2d20'], ['1d20', 6, '1d20+1d6'], ['2d6+3', 20, '2d6+1d20+3'], ['', 20, '1d20']]) {
      await set(start); await chip(n).dblclick(); await page.waitForTimeout(400); await expect(box, `real dblclick ${start || 'empty'} + d${n}`).toHaveValue(want);
      await set(start); await fire(n, 120, false); await page.waitForTimeout(500); await expect(box, `two quick clicks, no dblclick event, ${start || 'empty'} + d${n}`).toHaveValue(want);
      await set(start); await fire(n, 120, true); await page.waitForTimeout(500); await expect(box, `quick clicks + dblclick ${start || 'empty'} + d${n}`).toHaveValue(want);
      await set(start); await fire(n, 380, true); await page.waitForTimeout(500); await expect(box, `slow double-click ${start || 'empty'} + d${n}`).toHaveValue(want);
    }
    await set('1d20'); await chip(6).click(); await page.waitForTimeout(500); await expect(box, 'a single tap still replaces').toHaveValue('1d6');
  });
}
