// Logic tier: pure app logic driven through window.__pd. No pixel checks.
import { test, expect } from './helpers/app.mjs';

// State-only tests: one shared, paused page per worker, reset before each test (see `shared` in helpers/app.mjs).
test.beforeEach(async ({ shared }) => { await shared.reset(1); });

test('dice notation parsing', async ({ shared: app }) => {
  const P = await app.run(pd => Object.fromEntries(['4d6+2d10+3', 'd20', '3d8 - 2', '2d6+d20-1', 'd%', '1d100', '24d4', '2d7', '25d6', 'garbage', '']
    .map(s => [s, pd.parseNotation(s)])));
  expect(P['4d6+2d10+3']).toEqual({ terms: [{ count: 4, sides: 6 }, { count: 2, sides: 10 }], mod: 3 });
  expect(P['d20']).toEqual({ terms: [{ count: 1, sides: 20 }], mod: 0 });
  expect(P['3d8 - 2']).toEqual({ terms: [{ count: 3, sides: 8 }], mod: -2 });
  expect(P['2d6+d20-1']).toEqual({ terms: [{ count: 2, sides: 6 }, { count: 1, sides: 20 }], mod: -1 });
  expect(P['d%']).toEqual(P['1d100']);
  expect(P['24d4'].terms[0].count).toBe(24);
  for (const bad of ['2d7', '25d6', 'garbage', '']) expect(P[bad].error, bad).toBeTruthy();
});

const SIDES = { d6: 6, d8: 8, d10: 10, d100: 10, d12: 12, d20: 20, d14: 14, d16: 16, rd12: 12 };
const OPPOSITE_SUM = { d6: 7, d8: 9, d10: 9, d100: 90, d12: 13, d20: 21, d14: 15, d16: 17, rd12: 13 };   // d10 is 0-9, d% is 00-90

test('every shape: face count, unique labels, opposite faces sum to N+1', async ({ shared: app }) => {
  const geo = await app.run(async (pd, shapes) => {
    const out = {};
    for (const s of shapes) {
      pd.state.shape = s; await pd.buildDice(); const d = pd.dice[0];
      const opp = d.faces.map((f, k) => { const j = d.faces.findIndex(g => g.n.dot(f.n) < -0.999); return j < 0 ? null : d.labs[k] + d.labs[j]; });
      const unit = d.faces.every(f => Math.abs(f.n.length() - 1) < 1e-6);
      out[s] = { faces: d.faces.length, labs: d.labs, opp, unit };
    }
    return out;
  }, ['d4', ...Object.keys(SIDES)]);
  expect(geo.d4.faces).toBe(4);
  expect([...geo.d4.labs].sort()).toEqual([1, 2, 3, 4]);
  for (const [s, n] of Object.entries(SIDES)) {
    expect(geo[s].faces, s).toBe(n);
    expect(new Set(geo[s].labs).size, `${s} labels unique`).toBe(n);
    expect(geo[s].unit, `${s} unit normals`).toBe(true);
    expect(geo[s].opp, `${s} opposite sums`).toEqual(Array(n).fill(OPPOSITE_SUM[s]));
  }
});

test('design JSON round-trips', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const a = JSON.stringify(pd.designToJSON()); await pd.loadDesign(JSON.parse(a));
    return { same: JSON.stringify({ ...JSON.parse(a), paint_mode: 0 }) === JSON.stringify({ ...pd.designToJSON(), paint_mode: 0 }), format: JSON.parse(a).format };
  });
  expect(r).toEqual({ same: true, format: 'pretty-dice' });
});

test('design JSON keeps a custom set and its name', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const $ = id => document.getElementById(id);
    pd.state.shape = 'custom'; pd.state.notation = '3d8+2d6+4'; pd.state.substrate = 'swirl'; $('dname').value = 'Giant club attack'; await pd.buildDice();
    const j = JSON.stringify(pd.designToJSON());
    pd.state.shape = 'd20'; pd.state.notation = 'd20'; $('dname').value = ''; await pd.buildDice(); await pd.loadDesign(JSON.parse(j));
    return { shape: pd.state.shape, notation: pd.state.notation, name: $('dname').value, dice: pd.dice.length, saved: JSON.parse(j).name };
  });
  expect(r).toEqual({ shape: 'custom', notation: '3d8+2d6+4', name: 'Giant club attack', dice: 5, saved: 'Giant club attack' });
});

test('loading a bad design clamps ranges and rejects unknown shapes/colours', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const before = pd.state.shape, d = pd.designToJSON();
    d.edge_radius = 99; d.pattern.scale = -5; d.colors = ['red', '#zzzzzz', 3]; d.shape = 'd7'; d.substrate = 'cheese';
    let err = null; try { await pd.loadDesign(d); } catch (e) { err = e.message; }
    return { err, shape: pd.state.shape, before, sub: pd.state.substrate, scale: pd.state.scale, radius: pd.state.radius,
      colorsOk: pd.state.colors.every(c => /^#[0-9a-f]{6}$/i.test(c)), subOk: !!pd.SUBSTRATES[pd.state.substrate] };
  });
  expect(r.colorsOk).toBe(true);
  expect(r.subOk).toBe(true);
  expect(r.shape === r.before || r.err !== null, 'unknown shape is rejected or ignored').toBe(true);
  expect(r.scale).toBeGreaterThanOrEqual(0.5);
  expect(r.radius).toBeLessThanOrEqual(1);
});

test('shared palette survives substrate and stone changes; old palettes migrate', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const s = pd.state, out = {}, J = JSON.stringify;
    s.randsub = false; s.substrate = 'metal'; pd.randomize(true); const m = [...s.colors];
    out.metalExtrasFilled = m[1] !== '#000000' && m[2] !== '#000000' && m[1] !== m[0];
    pd.setSubstrate('swirl'); out.metalToSwirlKeeps = J(s.colors) === J(m);
    s.colors[2] = '#123456'; pd.setSubstrate('metal'); out.editFeedsMetal = s.colors[2] === '#123456' && s.palettes.shared[2] === '#123456';
    s.colors[0] = '#ff0000'; pd.setSubstrate('marble'); out.metalColourReachesStone = s.colors[0] === '#ff0000';
    pd.setStone('lapis'); out.stoneKeepsColours = s.colors[0] === '#ff0000';
    pd.setSubstrate('solid'); pd.randomize(true); const sp = [...s.colors]; out.solidExtrasFilled = sp[1] !== '#000000' && sp[2] !== '#000000';
    pd.setSubstrate('epoxy'); out.solidToEpoxyKeeps = J(s.colors) === J(sp);
    s.palettes = { old: ['#111111', '#222222', '#333333'] }; pd.ensurePalette(); out.migratesOld = s.colors[0] === '#111111';
    return out;
  });
  for (const [k, v] of Object.entries(r)) expect(v, k).toBe(true);
});

test('randomize -> other substrate -> back keeps colours', async ({ shared: app }) => {
  const r = await app.run(pd => {
    pd.randomize(); const sub = pd.state.substrate, before = JSON.stringify(pd.state.colors), other = Object.keys(pd.SUBSTRATES).find(k => k !== sub);
    document.querySelector(`#subs button[data-id=${other}]`).click(); document.querySelector(`#subs button[data-id=${sub}]`).click();
    return before === JSON.stringify(pd.state.colors);
  });
  expect(r).toBe(true);
});

test('colour shuffle changes only the base palette', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const s = pd.state, $ = id => document.getElementById(id); s.randsub = false; pd.setSubstrate('swirl');
    const c0 = JSON.stringify(s.colors), keep = JSON.stringify([s.substrate, s.shape, s.seed, s.off]);
    $('colorrand').click();
    return { changed: JSON.stringify(s.colors) !== c0, restSame: JSON.stringify([s.substrate, s.shape, s.seed, s.off]) === keep,
      shared: JSON.stringify(s.palettes.shared) === JSON.stringify(s.colors), inputs: $('c1').value === s.colors[0] };
  });
  expect(r).toEqual({ changed: true, restSame: true, shared: true, inputs: true });
});

test('stone dropdown keeps colours; paintbrush applies the stone palette', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const s = pd.state, $ = id => document.getElementById(id);
    s.substrate = 'marble'; pd.setSubstrate('marble'); s.colors[0] = '#ff00ff'; const before = JSON.stringify(s.colors);
    $('stone').value = 'lapis'; $('stone').dispatchEvent(new Event('change'));
    const kept = JSON.stringify(s.colors) === before && s.stone === 'lapis';
    $('stonepaint').click();
    const painted = JSON.stringify(s.colors) !== before && s.colors.every(c => /^#[0-9a-f]{6}$/i.test(c)) && JSON.stringify(s.palettes.shared) === JSON.stringify(s.colors);
    return { kept, painted };
  });
  expect(r).toEqual({ kept: true, painted: true });
});

test('200 randomizes reach every option without errors', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const seen = {}; let panel = 0;
    for (let i = 0; i < 200; i++) {
      pd.randomize(true); if (pd.state.panel > 0) panel++;
      for (const k of ['substrate', 'filigree', 'font', 'd6Style', 'numRaised', 'numPaint', 'stone', 'inclusion']) (seen[k] ??= new Set()).add(pd.state[k]);
    }
    return { panel, seen: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]])), substrates: Object.keys(pd.SUBSTRATES), stones: Object.keys(pd.STONES) };
  });
  expect(new Set(r.seen.substrate)).toEqual(new Set(r.substrates));
  expect(new Set(r.seen.stone)).toEqual(new Set(r.stones));
  expect(new Set(r.seen.filigree)).toEqual(new Set(['none', 'scroll', 'deco', 'beads']));
  expect(r.seen.font.length).toBeGreaterThanOrEqual(5);
  expect(new Set(r.seen.d6Style)).toEqual(new Set(['numbers', 'pips']));
  for (const k of ['numRaised', 'numPaint']) expect(r.seen[k].length, k).toBe(2);
  expect(r.seen.inclusion.length).toBeGreaterThan(1);
  expect(r.panel).toBeGreaterThan(10);   // relief panels show up regularly but not always
  expect(r.panel).toBeLessThan(190);
});

test('randomized filigree paints enamel into the atlas', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    pd.state.randshape = false; let n = 0;
    do { pd.randomize(); n++; } while (pd.state.filigree === 'none' && n < 40);
    await new Promise(r => setTimeout(r, 800));
    const img = pd.dice[0].atlas.mask.image, c = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let green = 0;
    for (let i = 0; i < c.length; i += 4) if (c[i + 1] > 128 && c[i] < 64) green++;
    return { filigree: pd.state.filigree, green };
  });
  expect(r.filigree).not.toBe('none');
  expect(r.green).toBeGreaterThan(100);
});
