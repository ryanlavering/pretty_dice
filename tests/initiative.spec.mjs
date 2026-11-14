// Initiative tracker inside the roll log (PD-142.14.1.8).
import { test, expect } from './helpers/app.mjs';

test('group rolls feed an ordered initiative list with turn and round, and it survives export', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => {
    pd.state.notation = '4x d20+2'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.simRoll();
    const e = pd.bag.log.at(-1); pd.initOps.add(pd.initOps.fromEntry(e)); pd.initOps.add([{ name: 'Thorn', total: 99 }]);
    const I = pd.bag.init, n0 = I.rows.length, first = I.rows[0].name, sorted = I.rows.every((x, i) => !i || I.rows[i - 1].total >= x.total);
    for (let i = 0; i < 5; i++) pd.initOps.next();   // 5 rows: wraps once
    const after = { turn: pd.bag.init.turn, round: pd.bag.init.round };
    const j = JSON.parse(JSON.stringify(pd.bagToJSON())), back = pd.parseBag(j).bag.init;
    pd.initOps.remove(0); const n = pd.bag.init.rows.length; pd.initOps.clear();
    return { n0, first, sorted, after, kept: back.rows.length, n, cleared: pd.bag.init.rows.length };
  });
  expect(r.n0).toBe(5); expect(r.first).toBe('Thorn'); expect(r.sorted).toBe(true);
  expect(r.after).toEqual({ turn: 0, round: 2 }); expect(r.kept).toBe(5); expect(r.n).toBe(4); expect(r.cleared).toBe(0);
});

test('the roll log shows a + init button per roll and the tracker rows, names editable', async ({ app, page }) => {
  await app.open();
  await app.run(pd => { pd.state.notation = '3x d20+1'; pd.state.shape = 'custom'; pd.buildDice(); pd.startRoll(false, false); pd.simRoll(); });
  await page.evaluate(() => { document.getElementById('logpanel').hidden = false; });
  await app.run(pd => pd.renderLog());
  await page.locator('#logpanel .lbl', { hasText: '+ init' }).first().click();
  await expect(page.locator('#logpanel .lir')).toHaveCount(3);
  await page.locator('#logpanel .lir input').first().fill('Goblin A'); await page.locator('#logpanel .lir input').first().blur();
  expect(await app.run(pd => pd.bag.init.rows.some(r => r.name === 'Goblin A'))).toBe(true);
  await page.locator('#logpanel .lih .linkbtn', { hasText: 'Next' }).click();
  await expect(page.locator('#logpanel .lih')).toContainText('round 1');
});
