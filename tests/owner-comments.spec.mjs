// Owner artifact comments 2026-11-15 (PD-142.38.6-.10): Sound section with basic controls first; Finish labels flush with the slider; Bag button bottom-left in Play;
// Design | Play in the drawer in Full view; the whole dock chip row on desktop.
import { test, expect } from './helpers/app.mjs';
const box = (p, sel) => p.locator(sel).first().boundingBox();
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: Finish end labels line up with the slider ends (.38.7)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign();
    const s = await box(page, '#polish'), m = await box(page, '.slends .ends span:first-child'), g = await box(page, '.slends .ends span:last-child');
    expect(Math.abs(m.x - s.x), 'matte starts at the slider left').toBeLessThanOrEqual(2);
    expect(Math.abs((g.x + g.width) - (s.x + s.width)), 'gloss ends at the slider right').toBeLessThanOrEqual(2);
  });
  test(`${name}: Bag button bottom-left in both rooms opens the Bag view and keeps clear of the dock (.38.8, .38.43)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open();
    await app.nav.toDesign(); await expect(page.locator('#bagbtn')).toBeVisible();
    await app.nav.toPlay(); await app.run(pd => pd.simRoll()); await page.waitForTimeout(300);
    const b = await box(page, '#bagbtn'), q = await box(page, '#qbar'); expect(b, 'the button is on screen in Play').toBeTruthy();
    expect(b.x + b.width <= q.x + 1 || b.y + b.height <= q.y || b.y >= q.y + q.height, 'no overlap with the dock').toBe(true);
    const st = await box(page, '#stage'); expect(b.x - st.x, 'at the left edge of the table').toBeLessThan(80); expect(b.y).toBeGreaterThan(vp.height * 0.3);
    await app.run(pd => pd.bagOps.rename(pd.bag.designs[0].id, 'Renamed')); await expect(page.locator('#bagbtn')).toHaveClass(/dirty/);   // the unsaved-changes dot
    await page.locator('#bagbtn').click();
    await expect(page.locator('#bagsheet')).toBeVisible();
    await expect(page.locator('#tiles')).toBeVisible();
  });
}
test('the drawer carries Design | Play in every view, and has no Reset to defaults (.38.9, .38.28)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay();
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toBeVisible(); await expect(page.locator('#reset')).toHaveCount(0); await app.nav.closeDrawer();
  await app.nav.fullView(true);
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toBeVisible(); await expect(page.locator('#roomsw')).toContainText('Design');
  await page.locator('#roomsw').click();
  await expect(page.locator('body')).toHaveClass(/design/);
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toContainText('Play');
});
test('desktop: the dock shows all seven dice and Adv/Dis without scrolling (.38.10)', async ({ app, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await app.open(); await app.nav.toPlay();
  await app.run(pd => pd.simRoll()); await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const c = document.getElementById('qchips'); return { fits: c.scrollWidth <= c.clientWidth + 1, n: c.querySelectorAll('[data-die]').length, adv: c.querySelectorAll('[data-adv]').length }; });
  expect(r.n).toBe(7); expect(r.adv).toBe(2); expect(r.fits, 'no horizontal scroll needed on desktop').toBe(true);
});

test('Keep and Discard for a random draft sit under Randomize in the Look tab, in a block with thumbnail and name (.38.17, .38.33)', async ({ app, page }) => {
  await app.open(); await app.nav.toDesign();
  await expect(page.locator('#draftact')).toBeHidden();
  await page.locator('#rand').click();
  await expect(page.locator('#draftact')).toBeVisible();
  const r = await box(page, '#rand'), k = await box(page, '#dkeep'); expect(k.y).toBeLessThan(r.y + 200);
  await expect(page.locator('#draftact .dname')).toHaveText('Random draft'); await expect(page.locator('#draftact #draftth')).toBeVisible();   // PD-142.38.33: thumbnail and name like the bag block
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('draftth')).backgroundImage)).not.toBe('none');
  const vw = page.viewportSize().width, d = await box(page, '#draftact'); expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x + d.width).toBeLessThanOrEqual(vw);
  const n0 = await app.run(pd => pd.bag.designs.length);
  await page.locator('#dkeep').click();
  expect(await app.run(pd => pd.bag.designs.length)).toBe(n0 + 1);
  await expect(page.locator('#draftact')).toBeHidden();
});

test('Raised numbers need a face panel; Patina is disabled without one (.38.14 .38.15)', async ({ app, page }) => {
  await app.open(); await app.nav.toDesign();
  await app.run(pd => { Object.assign(pd.state, { panel: 0, numRaised: true }); });
  await page.locator('#panel').evaluate(e => { e.value = 0; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#numstyle')).toHaveValue('inset');
  await expect(page.locator('#numstyle option[value="raised"]')).toBeDisabled();
  await expect(page.locator('#patina')).toBeDisabled();
  await page.locator('#panel').evaluate(e => { e.value = 0.12; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#numstyle option[value="raised"]')).toBeEnabled();
  await expect(page.locator('#numstyle')).toHaveValue('inset');   // PD-142.38.14: Raised was written to Inset when the panel went to 0; it does not come back by itself
  await expect(page.locator('#patina')).toBeEnabled();
  // exact owner steps: panel > 0, choose Raised, lower the panel to 0 -> the STORED numbering style is Inset too
  await page.locator('#panel').evaluate(e => { e.value = 0.12; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#numstyle').selectOption('raised'); expect(await app.run(pd => pd.state.numRaised)).toBe(true);
  await page.locator('#panel').evaluate(e => { e.value = 0; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(() => app.run(pd => ({ s: pd.state.numRaised, j: pd.designToJSON().relief.numbers }))).toEqual({ s: false, j: 'inset' });
  await expect(page.locator('#numstyle')).toHaveValue('inset');
  // a saved look with Raised and no panel loads as Inset, no error
  const ok = await app.run(pd => { const j = pd.designToJSON(); j.relief.panel = 0; j.relief.numbers = 'raised'; return !!j; });
  expect(ok).toBe(true);
});

test('Paint numbers sits with the colour controls (.38.13)', async ({ app, page }) => {
  await app.open(); await app.nav.toDesign();
  const order = await page.evaluate(() => { const ids = [...document.querySelectorAll('#panes [id]')].map(e => e.id); return { a: ids.indexOf('paintmode'), n: ids.indexOf('numpaint'), r: ids.indexOf('panel') }; });
  expect(order.n).toBeGreaterThan(order.a); expect(order.n - order.a).toBeLessThan(4); expect(order.n).toBeLessThan(order.r);
});

for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: the Full view handles overlap no other control (.38.18)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open();
    for (const room of ['toDesign', 'toPlay']) {
      await app.nav[room](); await page.waitForTimeout(250);
      const hit = await page.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const H = document.getElementById('paneclose'), h = H.getBoundingClientRect(), out = [];
        for (const e of document.querySelectorAll('button, input, select, #qbar, #shelf')) { if (e === H || H.contains(e) || e.id === 'paneopen' || !vis(e)) continue; const r = e.getBoundingClientRect(); if (r.left < h.right && h.left < r.right && r.top < h.bottom && h.top < r.bottom) out.push(e.id || e.textContent.trim().slice(0, 12) || e.tagName); }
        return out;
      });
      expect(hit, `${room}: nothing under the Full view handle`).toEqual([]);
    }
    await app.nav.fullView(true);
    const hit2 = await page.evaluate(() => { const O = document.getElementById('paneopen'), h = O.getBoundingClientRect(), out = []; for (const e of document.querySelectorAll('#tools button, #qbar, #shelf, #modesw button, #histrow button')) { const r = e.getBoundingClientRect(); if (r.width && r.left < h.right && h.left < r.right && r.top < h.bottom && h.top < r.bottom) out.push(e.id || e.tagName); } return out; });
    expect(hit2, 'nothing under the open handle in Full view').toEqual([]);
  });
}

test('Table tab also has Shape and Custom set; Look still does; a game hides them (.38.12)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay(); await app.run(pd => pd.simRoll());
  await page.locator('#paneltabs [data-pane=table]').click();
  await expect(page.locator('#shapes')).toBeVisible(); await expect(page.locator('#shapehead')).toBeVisible();
  await page.locator('#shapes button').nth(1).click();
  await expect(page.locator('#sec-dice')).toBeHidden();   // .38.23: the dock chips are enough
  await page.locator('#shapes button', { hasText: /custom/i }).click();
  await expect(page.locator('#customctl')).toBeVisible();
  await expect(page.locator('#panes h2', { hasText: 'Substrate' })).toBeHidden();   // the design controls stay in Look
  await app.nav.toDesign(); await expect(page.locator('#shapes')).toBeVisible();
});

// PD-142.38.22: no switch on the phone mat (the cube menu carries Design | Play, also in Full view); desktop switch above the tabs; no overlaps.
for (const [name, vp] of [['phone', { width: 390, height: 780 }], ['desktop', { width: 1280, height: 800 }]]) {
  test(`${name}: Design | Play placement, the cube menu, and no overlaps with Undo/Redo, the Bag button and the pane handles (.38.22)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign(); await page.waitForTimeout(300);
    const overlap = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const ids = ['#undo', '#redo', '#paneclose', '#paneopen', '#bagbtn', '#drawerbtn'];
    const check = async tag => { const boxes = []; for (const o of ids) { const el = page.locator(o).first(); if (await el.count() && await el.isVisible()) boxes.push([o, await el.boundingBox()]); }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i][1], boxes[j][1]), `${tag}: ${boxes[i][0]} overlaps ${boxes[j][0]}`).toBeFalsy(); };
    await expect(page.locator('#drawerbtn svg path').first()).toHaveAttribute('d', /M12 3 4 7.5/);   // the cube icon, not two circles
    await check('design'); if (process.env.PD_SHOTS) await page.screenshot({ path: `docs/design/screenshots/2026-11-16-38-22-${name}-design.png` });
    await app.nav.toPlay(); await page.waitForTimeout(300); await check('play'); if (process.env.PD_SHOTS) await page.screenshot({ path: `docs/design/screenshots/2026-11-16-38-22-${name}-play.png` });
    await app.nav.fullView(true); await page.waitForTimeout(300);
    await page.locator('#drawerbtn').click(); await expect(page.locator('#roomsw')).toBeVisible(); await page.locator('#roomsw').click(); await expect(page.locator('body')).toHaveClass(/design/);
    await page.waitForTimeout(300); await check('full'); if (process.env.PD_SHOTS) await page.screenshot({ path: `docs/design/screenshots/2026-11-16-38-22-${name}-fullview.png` });
    await app.nav.fullView(false);
    if (name === 'phone') { await expect(page.locator('aside #modesw')).toBeHidden(); }
    else { const k = await page.evaluate(() => [...document.querySelector('aside').children].map(e => e.id)); expect(k.indexOf('modesw')).toBeLessThan(k.indexOf('paneltabs')); await expect(page.locator('#modesw')).toBeVisible(); }
  });
}

test('Table tab: Shape buttons never throw; tap replaces the formula, double-click adds; Custom set mirrors the dock box (.38.23)', async ({ app, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await app.open(); await app.nav.toPlay(); await app.run(pd => pd.simRoll());
  await page.locator('#paneltabs [data-pane=table]').click();
  const st = () => app.run(pd => ({ throwing: document.body.classList.contains('throwing'), box: document.getElementById('rollbox').value, dice: pd.dice.length }));
  const before = await st();
  const shp = id => page.locator(`#shapes button[data-id="${id}"]`);
  await shp('d8').click(); await page.waitForTimeout(350); expect(await st()).toMatchObject({ box: '1d8', throwing: false, dice: before.dice });
  await shp('d8').click(); await page.waitForTimeout(350); expect((await st()).box, 'a second tap replaces').toBe('1d8');
  await page.waitForTimeout(500); await shp('d6').dblclick(); expect((await st()).box, 'double-click adds one').toBe('1d8+1d6');
  // Custom set control mirrors the box, both ways
  await page.locator('#shapes button', { hasText: /custom/i }).click(); await expect(page.locator('#customctl')).toBeVisible();
  await expect(page.locator('#notation')).toHaveValue('1d8+1d6');
  await page.locator('#steppers .step', { has: page.locator('[data-n="20"]') }).locator('button[data-d="1"]').click();
  expect((await st()).box, 'a stepper edit shows in the dock box').toMatch(/1d20/); expect((await st()).throwing).toBe(false);
  await page.locator('#rollbox').fill('3d6+2'); await expect(page.locator('#notation')).toHaveValue('3d6+2'); await expect(page.locator('#modv')).toHaveText('2');
  await page.locator('#notation').fill('2d10'); expect((await st()).box, 'typing in the Custom box shows in the dock box').toBe('2d10');
});

for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: Finish and Rotation sliders share the Colors slider edges; Rotation has range hints and a zero button (.38.25/.26)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign();
    const ref = await box(page, '#radius');
    for (const id of ['#polish', '#numsize', '#numrot']) {
      const b = await box(page, id);
      expect(Math.abs(b.x - ref.x), id + ' left edge').toBeLessThanOrEqual(1); expect(Math.abs((b.x + b.width) - (ref.x + ref.width)), id + ' right edge').toBeLessThanOrEqual(1);
    }
    await expect(page.locator('.row:has(#numrot) .ends')).toHaveText('-1800180');
    await page.locator('#numrot').fill('90'); await expect(page.locator('#numrotv')).toHaveText('90°');
    await page.locator('#numrotreset').click(); await expect(page.locator('#numrotv')).toHaveText('0°'); await expect(page.locator('#numrot')).toHaveValue('0');
  });
}

// PD-142.38.34: the same Shape semantics in Play and Design: tap = one die, selected, Custom collapsed; double-click / long press = add, Custom selected and expanded.
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: Play shape tap selects the shape and collapses Custom; double-click adds and opens Custom (.38.34)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toPlay();
    await page.locator('#paneltabs [data-pane=table]').click();
    const shp = id => page.locator(`#shapes button[data-id="${id}"]`);
    await shp('d8').click(); await expect(shp('d8')).toHaveClass(/\bon\b/); await expect(page.locator('#customctl')).toBeHidden();
    await page.waitForTimeout(500); await shp('d6').dblclick();
    await expect(page.locator('#rollbox')).toHaveValue('1d8+1d6'); await expect(page.locator('#customctl')).toBeVisible(); await expect(page.locator('#shapes button[data-id="custom"]')).toHaveClass(/\bon\b/);
    await page.waitForTimeout(500); await shp('d12').click(); await expect(page.locator('#rollbox')).toHaveValue('1d12'); await expect(shp('d12')).toHaveClass(/\bon\b/); await expect(page.locator('#customctl')).toBeHidden();
    await page.waitForTimeout(500); await page.evaluate(() => { document.getElementById('rollbox').value = ''; }); await shp('d10').click(); await page.waitForTimeout(500);
    await shp('d10').dblclick(); await expect(page.locator('#customctl'), 'a double-click on an empty formula still opens Custom').toBeVisible();
  });
  test(`${name}: Design shape tap and double-click follow the same semantics (.38.34)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign();
    const shp = id => page.locator(`#shapes button[data-id="${id}"]`), st = () => app.run(pd => ({ shape: pd.state.shape, n: pd.state.notation }));
    await shp('d8').click(); await expect(shp('d8')).toHaveClass(/\bon\b/); await expect(page.locator('#customctl')).toBeHidden(); expect((await st()).shape).toBe('d8');
    await page.waitForTimeout(500); await shp('d6').dblclick();
    await expect.poll(async () => (await st()).shape).toBe('custom'); expect((await st()).n).toBe('1d8+1d6');
    await expect(page.locator('#customctl')).toBeVisible();
    await page.waitForTimeout(500); await shp('d12').click(); await expect.poll(async () => (await st()).shape).toBe('d12'); await expect(page.locator('#customctl')).toBeHidden();
  });
}

// PD-142.38.35: a look change in the Design room rebuilds the dice but keeps their spin pose and the pause-spin state.
for (const shape of ['d20', 'set7']) {
  test(`${shape}: changing a slider and a select keeps the spin pose and the pause state (.38.35)`, async ({ app, page }) => {
    await app.open({ query: 'shape=' + shape }); await app.nav.toDesign();
    const pose = () => page.evaluate(() => window.__pd.dice.map(d => { const q = new d.mesh.quaternion.constructor(); d.mesh.getWorldQuaternion(q); return [q.x, q.y, q.z, q.w]; }));
    await page.evaluate(() => { const pd = window.__pd; pd.state.spin = 0; pd.dice.forEach((d, i) => { (pd.dice.length > 1 ? d.mesh : d.mesh.parent).quaternion.set(.5, .5, .5 + i * .01, .5).normalize(); }); });
    const before = await pose();
    for (const id of ['radius', 'numsize', 'numrot']) {
      await page.locator('#' + id).evaluate(e => { e.value = (+e.max + +e.min) / 2 + (+e.max - +e.min) * .2; e.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(600);
    }
    await page.locator('#subs button').nth(2).click(); await page.waitForTimeout(800);
    const after = await pose();
    expect(after.length).toBe(before.length);
    before.forEach((b, i) => { const dot = Math.abs(b.reduce((s, v, k) => s + v * after[i][k], 0)); expect(dot, `die ${i} kept its pose`).toBeGreaterThan(0.999); });
    expect(await app.run(pd => pd.state.spin), 'pause-spin state kept').toBe(0);
  });
}

// PD-142.38.36: a modified bag design shows the same Save / Save as copy / Revert block in the Look tab as the Bag tab, and the two always agree.
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: a modified design shows Save / Save as copy / Revert in the Look tab (.38.36)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign();
    await expect(page.locator('#draftact')).toBeHidden();
    await page.locator('#radius').evaluate(e => { e.value = 0.12; e.dispatchEvent(new Event('input')); });
    await expect(page.locator('#draftact')).toBeVisible(); await expect(page.locator('#draftpos')).toContainText('Modified');
    await expect(page.locator('#dkeep')).toHaveText('Save'); await expect(page.locator('#dcopy')).toBeVisible(); await expect(page.locator('#ddiscard')).toHaveText('Revert');
    const d = await box(page, '#draftact'), r = await box(page, '#rand'); expect(d.x + d.width).toBeLessThanOrEqual(vp.width); expect(d.y).toBeLessThan(r.y + 200);
    const n0 = await app.run(pd => pd.bag.designs.length);
    await page.locator('#dcopy').click(); expect(await app.run(pd => pd.bag.designs.length)).toBe(n0 + 1); await expect(page.locator('#draftact')).toBeHidden();
    await page.locator('#radius').evaluate(e => { e.value = 0.03; e.dispatchEvent(new Event('input')); }); await expect(page.locator('#draftact')).toBeVisible();
    await page.locator('#dkeep').click(); await expect(page.locator('#draftact')).toBeHidden(); expect(await app.run(pd => pd.bag.designs.length)).toBe(n0 + 1);
    await page.locator('#radius').evaluate(e => { e.value = 0.14; e.dispatchEvent(new Event('input')); }); await expect(page.locator('#draftact')).toBeVisible();
    await page.locator('#ddiscard').click(); await expect(page.locator('#draftact')).toBeHidden();
  });
}

// PD-142.38.37: the roll set on the mat is a draft outside the bag: editing it (even one loaded from a named set) never dirties the bag or changes the saved set.
test('editing the roll set on the mat leaves a clean bag clean and the named set unchanged (.38.37)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay();
  await page.locator('#rollbox').fill('3d6+2'); await page.locator('#rollbox').press('Enter'); await page.waitForTimeout(600);
  await page.locator('#paneltabs [data-pane=table]').click();
  await page.locator('#steppers .step', { has: page.locator('[data-n="20"]') }).locator('button[data-d="1"]').click();
  await page.locator('#shapes button[data-id="d8"]').dblclick();
  await app.nav.toDesign(); await app.nav.openBag(); await page.waitForTimeout(300);
  await expect(page.locator('#bagdirty'), 'the bag is still clean after editing the roll set').toBeHidden();
  // a named set loaded onto the mat and edited stays as it was saved
  const id = await app.run(pd => pd.setOps.create({ name: 'Fireball', terms: [{ count: 8, sides: 6 }], mod: 0 }));
  const snap = () => app.run(pd => JSON.stringify([pd.bag.sets.map(({ last, ...r }) => r), pd.bag.designs.map(d => d.design.notation), Object.keys(pd.bag.pending)]));
  await app.run((pd, id) => pd.setOps.open(id), id); const s0 = await snap();
  await app.nav.toPlay(); await page.locator('#paneltabs [data-pane=table]').click();
  await page.locator('#steppers .step', { has: page.locator('[data-n="20"]') }).locator('button[data-d="1"]').click();
  await page.locator('#rollbox').fill('2d10+1'); await page.locator('#rollbox').press('Enter'); await page.waitForTimeout(600);
  expect(await snap(), 'sets, designs and pending edits are untouched by roll-set edits').toBe(s0);
});

// PD-142.38.38: formula changes keep the pose of dice that persist (Adv <-> Dis, modifier, an extra die).
test('Adv <-> Dis, a modifier and an added die keep the pose of the dice that stay (.38.38)', async ({ app, page }) => {
  await app.open({ query: 'shape=custom&notation=2d20kh1' }); await app.nav.toDesign();
  const pose = () => page.evaluate(() => window.__pd.dice.map(d => { const q = new d.mesh.quaternion.constructor(); d.mesh.getWorldQuaternion(q); return [q.x, q.y, q.z, q.w]; }));
  await page.evaluate(() => { const pd = window.__pd; pd.state.spin = 0; pd.dice.forEach((d, i) => d.mesh.quaternion.set(.5, .5 + i * .2, .5, .5).normalize()); });
  const p0 = await pose(); expect(p0.length).toBe(2);
  const same = (a, b, what) => { const dot = Math.abs(a.reduce((s, v, k) => s + v * b[k], 0)); expect(dot, what).toBeGreaterThan(0.999); };
  for (const [f, n] of [['2d20kl1', 2], ['2d20kh1', 2], ['2d20kl1+3', 2], ['2d20kl1+3+1d6', 3]]) {
    await page.locator('#notation').fill(f); await page.locator('#notapply').click(); await page.waitForTimeout(600);
    const p = await pose(); expect(p.length, f).toBe(n); same(p[0], p0[0], f + ' die 1'); same(p[1], p0[1], f + ' die 2');
  }
  expect(await app.run(pd => pd.state.spin)).toBe(0);
});

// PD-142.38.39: Reset view returns every die in the Design showcase to the face-on pose, not just the camera.
for (const shape of ['d20', 'custom']) {
  test(`${shape}: Reset view brings every die back face-on and the camera to default (.38.39)`, async ({ app, page }) => {
    await app.open({ query: 'shape=' + shape + (shape === 'custom' ? '&notation=2d20kh1%2B1d6' : '') }); await app.nav.toDesign();
    await page.evaluate(() => { const pd = window.__pd; pd.state.spin = 0; pd.orbit.az = 0.7; pd.orbit.el = 0.4; pd.dice.length > 1 ? pd.dice.forEach((d, i) => d.mesh.quaternion.set(.5, .5 + i * .2, .5, .5).normalize()) : pd.rig.quaternion.set(.5, .5, .5, .5).normalize(); });
    await app.nav.openDrawer(); await page.locator('#resetview').click(); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const pd = window.__pd; return { az: pd.orbit.az, el: pd.orbit.el, q: pd.dice.map(d => { const q = new d.mesh.quaternion.constructor(); d.mesh.getWorldQuaternion(q); return [q.x, q.y, q.z, q.w]; }) }; });
    expect(r.az).toBe(0); expect(r.el).toBe(0);
    r.q.forEach((q, i) => expect(Math.abs(q[3]), `die ${i} face-on`).toBeGreaterThan(0.999));
  });
}

// PD-142.38.40: a single tap waits for a possible double-click; a double-click goes straight to previous + 1 die with no single-die flash.
test('shape buttons and dock chips: a double-click never passes through the single-die formula; a tap applies after the short wait (.38.40)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay(); await page.locator('#paneltabs [data-pane=table]').click();
  await page.locator('#rollbox').fill('2d6'); await page.locator('#rollbox').blur();
  await page.evaluate(() => { window.__seen = []; const b = document.getElementById('rollbox'); new MutationObserver(() => {}).observe(b, { attributes: true }); const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); Object.defineProperty(b, 'value', { get() { return d.get.call(this); }, set(v) { window.__seen.push(v); d.set.call(this, v); } }); });
  await page.locator('#shapes button[data-id="d8"]').dblclick(); await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__seen), 'only the final formula was ever written').toEqual(['2d6+1d8']);
  await page.evaluate(() => { window.__seen = []; });
  await page.locator('#shapes button[data-id="d12"]').click();
  expect(await page.locator('#rollbox').inputValue(), 'not applied yet right after the tap').toBe('2d6+1d8');
  await expect(page.locator('#rollbox')).toHaveValue('1d12');
  await page.waitForTimeout(400); await page.locator('#qbar .dchip[data-die="6"]').dblclick(); await page.waitForTimeout(500);
  expect(await page.locator('#rollbox').inputValue()).toBe('1d12+1d6');
  expect((await page.evaluate(() => window.__seen)).filter(v => v === '1d6'), 'the chip double-click never showed 1d6 alone').toEqual([]);
});

// PD-142.38.51: the one relief rule (Raised numbers need Panel > 0) holds after every Randomize, undo/redo and applyLook.
test('Randomize never leaves Raised numbers without a face panel (.38.51)', async ({ app }) => {
  await app.open(); await app.nav.toDesign();
  const r = await app.run(async pd => {
    const bad = []; let raised = 0, panels = 0;
    for (let i = 0; i < 200; i++) { pd.randomize(true); const s = pd.state; if (s.panel > 0) panels++; if (s.numRaised) raised++; if (s.numRaised && !(s.panel > 0)) bad.push(i); }
    pd.state.panel = 0; pd.state.numRaised = true; pd.applyLook(); const afterApply = pd.state.numRaised;
    return { bad, raised, panels, afterApply };
  });
  expect(r.bad, 'Raised with panel 0 after Randomize').toEqual([]);
  expect(r.panels, 'the run does cover designs with a panel').toBeGreaterThan(10);
  expect(r.raised, 'and Raised still happens when there is a panel').toBeGreaterThan(0);
  expect(r.afterApply).toBe(false);
});
