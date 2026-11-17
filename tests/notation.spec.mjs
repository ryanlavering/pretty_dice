// Roll notation: keep highest/lowest, drop, advantage/disadvantage (PD-142.2, playtest .1).
import { test, expect } from './helpers/app.mjs';

test('parses kh/kl/dh/dl and adv/dis, and round-trips them', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const f = s => { const p = pd.parseNotation(s); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod); };
    return { kh: f('4d6kh3+2'), kl: f('2d20kl'), dl: f('4d6dl1'), dh: f('5d8dh2'), adv: f('d20adv+5'), dis: f('d20dis'), all: f('3d6kh3'),
      badAdv: f('2d20adv'), tooMany: f('3d6kh4'), dropAll: f('3d6dl3'), sum: pd.keepSum([3, 6, 2, 5], { mode: 'h', n: 2 }).sum, low: pd.keepSum([3, 6, 2, 5], { mode: 'l', n: 1 }).sum, plain: pd.keepSum([3, 6], null).sum };
  });
  expect(r.kh).toBe('4d6kh3+2'); expect(r.kl).toBe('2d20kl1'); expect(r.dl).toBe('4d6kh3'); expect(r.dh).toBe('5d8kl3');
  expect(r.adv).toBe('2d20kh1+5'); expect(r.dis).toBe('2d20kl1'); expect(r.all).toBe('3d6');
  expect(r.badAdv).toMatch(/^ERR/); expect(r.tooMany).toMatch(/^ERR/); expect(r.dropAll).toMatch(/^ERR/);
  expect(r.sum).toBe(11); expect(r.low).toBe(2); expect(r.plain).toBe(9);
});

// PD-142.14.1.1.4: the count after kh / kl / dh / dl is optional and means 1.
test('kh, kl, dh and dl without a number default to 1', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    const f = s => { const p = pd.parseNotation(s); return p.error ? 'ERR ' + p.error : pd.fmtNotation(p.terms, p.mod); };
    return { kh: f('2d20kh'), khp: f('2d20kh+3'), kl: f('2d20kl'), dl: f('4d6dl'), dh: f('4d6dh'), spaced: f('2D20 KH + 3'), full: f('2d20kh1'), k: f('2d20k'), d: f('4d6d'), kh0: f('2d20kh0'), dl0: f('4d6dl0'), tooMany: f('1d20dl'), mixed: f('2d20kh+4d6dl') };
  });
  expect(r.kh).toBe('2d20kh1'); expect(r.khp).toBe('2d20kh1+3'); expect(r.kl).toBe('2d20kl1'); expect(r.dl).toBe('4d6kh3'); expect(r.dh).toBe('4d6kl3');
  expect(r.spaced).toBe('2d20kh1+3'); expect(r.full).toBe(r.kh);
  expect(r.mixed).toBe('2d20kh1+4d6kh3');
  for (const bad of [r.k, r.d, r.kh0, r.dl0, r.tooMany]) expect(bad).toMatch(/^ERR/);
});

test('a roll with advantage logs both dice, sets one aside and totals the kept one; quick roll agrees', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(async pd => {
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'adv', name: 'Adv', terms: [{ count: 2, sides: 20, keep: { mode: 'h', n: 1 } }], mod: 3 }], active: { design: 'a' } }, { replace: true });
    const tot = pd.setOps.quick('adv'); const e = pd.bag.log.at(-1);
    return { tot, notation: e.notation, detail: e.detail };
  });
  expect(r.notation).toBe('2d20kh1+3');
  const m = r.detail.match(/2d20kh1: (\(?\d+\)?)\+(\(?\d+\)?) = (\d+)/); expect(m).toBeTruthy();
  expect(m.slice(1, 3).filter(x => x.startsWith('(')).length).toBe(1);   // exactly one die set aside
  expect(+m[3] + 3).toBe(r.tot);
});

test('Adv and Dis buttons: click replaces the formula with d20adv / d20dis, double-click adds it (PD-142.38.32)', async ({ app, page }) => {
  await app.open();
  await page.locator('#shapes button[data-id="custom"]').click();
  await page.locator('#notation').fill('d20+4'); await page.locator('#notadv').click();
  await expect(page.locator('#notation')).toHaveValue('2d20kh1');
  await page.locator('#notdis').click();
  await expect(page.locator('#notation')).toHaveValue('2d20kl1');
  await page.locator('#notation').fill('3d6+4'); await page.locator('#notapply').click();
  await page.waitForTimeout(500); await page.locator('#notadv').dblclick();
  await expect(page.locator('#notation')).toHaveValue('3d6+2d20kh1+4');
});

test('a physical 2d20kh1 roll totals only the higher die and shows the other in brackets', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    pd.state.notation = '2d20kh1+2'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false);
    pd.simRoll(); const e = pd.bag.log.at(-1);
    return { total: +e.total, detail: e.detail, text: document.querySelector('#result .tot').textContent };
  });
  const m = r.detail.match(/2d20kh1: (\(?\d+\)?)\+(\(?\d+\)?) = (\d+)/); expect(m).toBeTruthy();
  const vals = [m[1], m[2]].map(x => +x.replace(/[()]/g, '')); expect(+m[3]).toBe(Math.max(...vals));
  expect([m[1], m[2]].filter(x => x.startsWith('(')).length).toBe(vals[0] === vals[1] ? 1 : 1);
  expect(r.total).toBe(+m[3] + 2); expect(r.text).toBe(String(r.total));
});
