// PD-155: backup self-check that a settled die's stored face matches the face its orientation shows.
// The page is shared by the tests of a worker and pd.faceFixes is a page-lifetime counter, so every test counts fixes relative to its own start (root cause of a full-suite flake: absolute counts depended on which tests the worker had already run).
import { test, expect } from './helpers/app.mjs';

test('normal rolls never trigger the self-check', async ({ shared: app }) => {
  await app.reset(155);
  const warns = []; app.page.on('console', m => { if (m.type() === 'warning' && m.text().includes('PD-155')) warns.push(m.text()); });
  const r = await app.run(pd => {
    pd.pause(); pd.state.shape = 'custom'; pd.state.notation = '5d6'; pd.buildDice(); let fixes = 0; const f0 = pd.faceFixes;
    for (let k = 0; k < 12; k++) { pd.simRoll({ rerolls: 6 }); for (let n = 0; n < 40; n++) pd.renderOnce(1 / 60); fixes += pd.faceCheck('test') ? 1 : 0; }
    return { fixes, counter: pd.faceFixes - f0 };
  });
  expect(r).toEqual({ fixes: 0, counter: 0 });
  expect(warns).toEqual([]);
});

test('a die turned onto another face after settle is re-read, warned about and counted', async ({ shared: app }) => {
  await app.reset(156);
  const warns = []; app.page.on('console', m => { if (m.type() === 'warning' && m.text().includes('PD-155')) warns.push(m.text()); });
  const r = await app.run(pd => {
    pd.pause(); pd.state.shape = 'custom'; pd.state.notation = '3d6'; pd.buildDice();
    const f0 = pd.faceFixes;
    let t = 0; do { pd.simRoll({ rerolls: 6 }); t++; } while (pd.leans.some(Boolean) && t < 10);
    const before = pd.faces.slice(), rec0 = pd.recFaces.slice(), main0 = document.querySelector('#result .tot').textContent;
    pd.nudgeDie(1); const shown = pd.faces.slice();
    const fixed = pd.faceCheck('test');
    return { before, rec0, main0, shown, fixed, rec1: pd.recFaces.slice(), main1: document.querySelector('#result .tot').textContent, counter: pd.faceFixes - f0 };
  });
  expect(r.rec0).toEqual(r.before);
  expect(r.shown[1]).not.toBe(r.before[1]);
  expect(r.fixed).toBe(true);
  expect(r.rec1).toEqual(r.shown);                                   // the re-read value is the one now used
  expect(Number(r.main1)).toBe(r.shown.reduce((a, b) => a + b, 0)); // total refreshed
  expect(r.counter).toBe(1);
  expect(warns.length).toBe(1);
  expect(warns[0]).toContain('die 1');
});

test('the loop notices a bump after settle by itself', async ({ shared: app }) => {
  await app.reset(157);
  const r = await app.run(pd => {
    pd.pause(); pd.state.shape = 'custom'; pd.state.notation = '2d6'; pd.buildDice();
    const f0 = pd.faceFixes;
    let t = 0; do { pd.simRoll({ rerolls: 6 }); t++; } while (pd.leans.some(Boolean) && t < 10);
    pd.nudgeDie(0); for (let n = 0; n < 24; n++) pd.renderOnce(1 / 60);
    return { counter: pd.faceFixes - f0, same: JSON.stringify(pd.recFaces) === JSON.stringify(pd.faces) };
  });
  expect(r.counter).toBeGreaterThanOrEqual(1); expect(r.same).toBe(true);
});

test('yahtzee: a corrupted stored value is replaced by the re-read one at score time', async ({ shared: app }) => {
  await app.reset(158);
  const warns = []; app.page.on('console', m => { if (m.type() === 'warning' && m.text().includes('PD-155')) warns.push(m.text()); });
  await app.run(pd => { pd.pause(); pd.startGame('yahtzee', ['P1'], {}, []); pd.simRoll({ rerolls: 6 }); });
  const r = await app.run(pd => {
    const f0 = pd.faceFixes, real = pd.faces.slice(); pd.corruptFace(2, real[2] === 1 ? 2 : 1);
    const fixed = pd.faceCheck('before score entry');
    return { fixed, rec: pd.recFaces.slice(), real, counter: pd.faceFixes - f0 };
  });
  expect(r.fixed).toBe(true); expect(r.rec).toEqual(r.real); expect(r.counter).toBe(1); expect(warns.length).toBe(1);
});
