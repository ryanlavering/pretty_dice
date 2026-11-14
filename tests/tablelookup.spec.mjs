// Table lookup: a saved set can carry a result table (PD-142.14.1.7).
import { test, expect } from './helpers/app.mjs';

test('lookupTable reads single results, ranges and open-ended lines', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(pd => { const t = '1-2 Locked door\n3: Empty room\n4 – 7 Goblins\n8+ Boss'; const f = n => pd.lookupTable(t, n);
    return [f(1), f(2), f(3), f(5), f(8), f(20), f(0), pd.lookupTable('', 3), pd.lookupTable(t, 'x')]; });
  expect(r).toEqual(['Locked door', 'Locked door', 'Empty room', 'Goblins', 'Boss', 'Boss', null, null, null]);
});

test('a set with a table shows the result line in a quick roll, the log, the text export and a physical roll', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(async pd => {
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'door', name: 'Door', terms: [{ count: 1, sides: 8 }], mod: 0, table: '1-4 Locked\n5+ Open' }], active: { design: 'a' } }, { replace: true });
    const tot = pd.setOps.quick('door'), e = pd.bag.log.at(-1), want = tot <= 4 ? 'Locked' : 'Open';
    const text = pd.logText();
    pd.setOps.open('door'); pd.startRoll(false, false); pd.simRoll();
    const e2 = pd.bag.log.at(-1), shown = document.querySelector('#result .look')?.textContent;
    return { want, look: e.lookup, text, look2: e2.lookup, shown, total2: e2.total };
  });
  expect(r.look).toBe(r.want); expect(r.text).toContain('→ ' + r.want);
  expect(r.look2).toBe(+r.total2 <= 4 ? 'Locked' : 'Open'); expect(r.shown).toBe('→ ' + r.look2);
});

test('the set editor saves the table with the set', async ({ shared: app }) => {
  await app.reset(1);
  const r = await app.run(async pd => {
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'T', designs: [{ id: 'a', name: 'A', design: { ...pd.designToJSON(), name: 'A' } }],
      sets: [{ id: 'd', name: 'D', terms: [{ count: 1, sides: 8 }], mod: 0 }], active: { design: 'a' } }, { replace: true });
    pd.setOps.edit('d', { name: 'D', terms: [{ count: 1, sides: 8 }], mod: 0, table: '1-8 Everything' }); const t = pd.setOps.find('d').table;
    pd.setOps.edit('d', { name: 'D', terms: [{ count: 1, sides: 8 }], mod: 0, table: '  ' }); return { t, gone: 'table' in pd.setOps.find('d') };
  });
  expect(r.t).toBe('1-8 Everything'); expect(r.gone).toBe(false);
});
