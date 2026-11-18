// Behavioural golden set for the 4.1 factoring (A/B point): docs/design/v41-baseline.md.
// The specs assert invariants; this file records what the app actually produces for fixed seeds and inputs, so a refactor
// that changes any output (an extra rng() call, a reordered build step, a moved CSS rule) shows up as a diff.
//   compare (default):        npx playwright test tests/golden.spec.mjs        fails on any difference from tests/golden/*.json
//   record:  PD_GOLDEN=record npx playwright test tests/golden.spec.mjs        rewrites the files (only on purpose, with a reason in the commit)
// Everything here is deterministic on one machine (seeded app RNG, seeded Math.random, fixed viewport, DPR 1, paused loop).
// Canvas 2D atlases and the software-WebGL frame are hashed; those hashes are machine-specific (fonts, rasteriser), so record and
// compare on the same machine. Numbers are rounded to 6 decimals.
import { test, expect } from './helpers/app.mjs';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, 'golden');
const RECORD = process.env.PD_GOLDEN === 'record';
const golden = (name, data) => {
  const file = path.join(DIR, name + '.json'), text = JSON.stringify(data, null, 1) + '\n';
  if (RECORD) { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(file, text); return; }
  expect(fs.existsSync(file), `${file} is missing: record it with PD_GOLDEN=record`).toBe(true);
  expect(JSON.parse(text), `golden ${name}`).toEqual(JSON.parse(fs.readFileSync(file, 'utf8')));
};

// in-page helpers, installed once per page: q() rounds numbers, hash() is FNV-1a over canvas pixels
const install = page => page.evaluate(() => {
  if (window.__g) return;
  const q = v => typeof v === 'number' ? (Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : String(v)) : Array.isArray(v) ? v.map(q)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, q(v[k])])) : v;
  const fnv = bytes => { let h = 0x811c9dc5; for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
  const hashCanvas = c => { const g = c.getContext('2d'); return c.width + 'x' + c.height + ':' + fnv(g.getImageData(0, 0, c.width, c.height).data); };
  const hashGL = cv => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return hashCanvas(c); };
  const pose = pd => pd.dice.map((d, i) => ({ name: d.name, pos: pd.bodies[i].position.toArray(), quat: pd.bodies[i].quaternion.toArray() }));
  window.__g = { q, fnv, hashCanvas, hashGL, pose };
});

test.describe('golden: model', () => {
  test.beforeEach(async ({ shared }) => { await shared.reset(1); await install(shared.page); });

  test('notation: parse, format and keep-sum results', async ({ shared }) => {
    const NOTATIONS = ['d20', '1d20', '2d6', '4d6+2', '3d8-1', 'd%', '1d100', '2d10+1d4+3', '4d6kh3', '4d6dl1', '2d20kl1', '5d10dh2', '3d6kh0',
      '4d6kh5', 'd20adv', 'd20dis', '2d20adv', 'd12adv', 'd20+5 adv', 'd20+5 dis', '4x d20+2', '3×2d6', '1x d20', 'd7', 'd0', '0d6', 'd',
      '', '   ', 'abc', '2d6+', '+3', '-2', '10d6', '60d6', '61d6', '200d20', '20x 4d6', 'd4+d6+d8+d10+d12+d20', 'D20', ' 2 d 6 ', 'd14', 'd16',
      'd20@zzz', '2d6-3+1d4'];
    const r = await shared.run((pd, list) => list.map(s => { const p = pd.parseNotation(s), ps = pd.parseNotation(s, true);
      return { s, p, strict: ps, fmt: p.error ? null : pd.fmtNotation(p.terms, p.mod, p.group) }; }), NOTATIONS);
    const ks = await shared.run(pd => [[[3, 5, 1, 6], { mode: 'h', n: 3 }], [[3, 5, 1, 6], { mode: 'l', n: 1 }], [[4, 4, 2], { mode: 'h', n: 2 }], [[1, 2], null], [[6, 6, 6], { mode: 'l', n: 5 }]]
      .map(([v, k]) => { const o = pd.keepSum(v, k); return { v, k, sum: o.sum, kept: [...o.kept].sort() }; }));
    golden('notation', { parse: r, keepSum: ks });
  });

  test('looks: seeded randomize and the design JSON round trip', async ({ shared }) => {
    const out = [];
    for (const seed of [1, 2, 3, 7, 42, 1234]) {
      await shared.reset(seed);
      out.push(await shared.run(async pd => {
        const g = window.__g, looks = [];
        for (let i = 0; i < 3; i++) { pd.randomize(true); const j = pd.designToJSON(); pd.loadDesign(JSON.parse(JSON.stringify(j))); const back = pd.designToJSON();
          looks.push({ design: g.q(j), roundTripSame: JSON.stringify(back) === JSON.stringify(j) }); }
        return looks;
      }));
    }
    golden('looks', out);
  });

  test('rolls: every shape, two seeds, results and final poses', async ({ shared }) => {
    const out = {};
    for (const shape of ['d4', 'd6', 'd8', 'd10', 'd100', 'd12', 'd20', 'd14', 'd16', 'rd12', 'set7'])
      for (const seed of [1, 5]) {
        await shared.reset(seed);
        out[shape + '/' + seed] = await shared.run(async (pd, shape) => {
          pd.state.shape = shape; await pd.buildDice(); pd.applyLook(); const g = window.__g;
          const a = pd.simRoll(), poseA = g.pose(pd), b = pd.simRoll();
          return g.q({ first: { settled: a.settled, simT: a.simT, leans: a.leans, result: a.result, dice: a.dice, pose: poseA }, second: { result: b.result, dice: b.dice, pose: g.pose(pd) } });
        }, shape);
      }
    for (const [notation, seed] of [['3d6+2', 3], ['2d20kh1', 4], ['4d6dl1', 6], ['1d20+1d12+2d4-1', 8]]) {
      await shared.reset(seed);
      out[notation + '/' + seed] = await shared.run(async (pd, notation) => {
        pd.state.shape = 'custom'; pd.state.notation = notation; await pd.buildDice(); pd.applyLook(); const g = window.__g, a = pd.simRoll();
        return g.q({ settled: a.settled, simT: a.simT, result: a.result, main: a.main, dice: a.dice, pose: g.pose(pd) });
      }, notation);
    }
    golden('rolls', out);
  });

  test('atlas: number and pip atlases hash the same', async ({ shared }) => {
    const r = await shared.run(pd => {
      const g = window.__g, range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i), out = {};
      const cases = { d20cinzel: [20, range(1, 20), 'cinzel', 2, false], d10pad: [10, range(0, 9), 'uncial', 1, true], d12inter: [12, range(1, 12), 'inter', 3, false],
        d6pips: [6, range(1, 6), 'cinzel', 2, false, { layout: 'pips' }], d4tips: [4, range(1, 4), 'metamorphous', 2, false, { layout: 'tips', tips: [[2, 3, 4], [1, 3, 4], [1, 2, 4], [1, 2, 3]] }],
        d8big: [8, range(1, 8), 'georgia', 2, false, { big: true, numSize: .7 }] };
      for (const [k, args] of Object.entries(cases)) { const a = pd.makeAtlas(...args); out[k] = { cols: a.cols, rows: a.rows, cell: a.cell, info: g.q(a.info), bump: g.hashCanvas(a.bump.image), mask: g.hashCanvas(a.mask.image) }; }
      return out;
    });
    golden('atlas', r);
  });
});

test.describe('golden: boot', () => {
  for (const [seed, query] of [[1, ''], [9, 'shape=d20'], [17, 'shape=set7']])
    test(`fresh boot seed ${seed} ${query}: look, first roll and a rendered frame`, async ({ app }) => {
      await app.open({ seed, query }); await install(app.page);
      // no frame of the showcase: its spin depends on how long the page ran before pause(); the settled roll is a fixed pose
      const r = await app.run(pd => { const g = window.__g; pd.pause(); const look = g.q(pd.designToJSON());
        const roll = pd.simRoll(); pd.renderOnce();
        return { look, roll: g.q({ settled: roll.settled, simT: roll.simT, result: roll.result, dice: roll.dice, pose: g.pose(pd) }), frame1: g.hashGL(pd.canvas),
          memory: (({ geometries, textures }) => ({ geometries, textures }))(pd.memory()) }; });
      golden(`boot-${seed}${query ? '-' + query.replace(/[^\w]+/g, '_') : ''}`, r);
    });
});

// DOM of the main screens: every element with an id (tag, classes, own text, shown or not, box) plus the text of shown buttons.
// Volatile parts are left out: the boot screen, the lag toast, and anything time-stamped.
const snapDom = page => page.evaluate(() => {
  const SKIP = new Set(['boot', 'bootbox', 'bootdice', 'bootbar', 'bootmsg', 'bootlog', 'lagtoast']);
  const shown = e => { const s = getComputedStyle(e); return e.getClientRects().length > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ').slice(0, 80);
  const box = e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); };
  const out = { body: document.body.className, ids: {}, buttons: [] };
  for (const e of document.querySelectorAll('body [id]')) {
    if (SKIP.has(e.id) || e.closest('#boot')) continue;
    const vis = shown(e), rec = { tag: e.tagName.toLowerCase(), cls: [...e.classList].sort().join(' '), shown: vis };
    if (vis) { rec.box = box(e); const t = own(e); if (t) rec.text = t; if ('value' in e && e.type !== 'file' && e.tagName !== 'BUTTON') rec.value = String(e.value).slice(0, 80);
      if (e.type === 'checkbox' || e.type === 'radio') rec.checked = e.checked; if (e.hidden) rec.hidden = true; }
    out.ids[e.id] = rec;
  }
  for (const b of document.querySelectorAll('button')) if (shown(b) && !b.closest('#boot') && !SKIP.has(b.id)) out.buttons.push((b.id ? '#' + b.id + ' ' : '') + (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  return out;
});
// wait until CSS transitions/animations have finished (infinite ones are ignored), then stop the render loop so nothing moves
const settle = async page => {
  await page.waitForFunction(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length === 0, null, { timeout: 20_000 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
};

for (const [w, h] of [[390, 740], [1280, 800]])
  test.describe(`golden: screens ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });
    test('Play, Design, Bag view and Games', async ({ app }) => {
      const p = app.page; await app.open({ seed: 3 }); await install(p);
      const shots = {};
      await app.nav.toPlay(); await app.run(pd => { pd.simRoll(); }); await settle(p); shots.play = await snapDom(p);
      await app.nav.toDesign(); await settle(p); shots.design = await snapDom(p);
      await app.nav.openBag(); await settle(p); shots.bag = await snapDom(p);
      await p.keyboard.press('Escape'); await expect(p.locator('#bagsheet')).toBeHidden();
      await app.run(pd => pd.openGames()); await settle(p); shots.games = await snapDom(p);
      golden(`screens-${w}x${h}`, shots);
    });
  });
// The build sizes are recorded by scripts/golden-build.mjs (not here: building inside the suite would race the offline and artifact specs, which write the same dist/ files).
