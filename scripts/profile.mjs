// Profile what a design switch and a mixed set cost (JS time, GPU objects). Run through the test lock so it measures a quiet machine:
//   sh scripts/with-test-lock.sh node scripts/profile.mjs
// Software GL (swiftshader) makes frames slow, so the numbers that matter are the build times and the object counts, not fps.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const base = 'http://127.0.0.1:8125';
let server = spawn(process.execPath, [new URL('./serve.mjs', import.meta.url).pathname, '8125'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 420 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`${base}/index.html?libs=local&seed=3`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 60_000 });
  const out = await page.evaluate(async () => {
    const pd = window.__pd, T = async f => { const t = performance.now(); await f(); return +(performance.now() - t).toFixed(1); };
    const sync = () => { const gl = pd.canvas.getContext('webgl2'); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); };   // wait for the GPU, so frame times are real
    const one = () => { const t = performance.now(); pd.renderOnce(); sync(); return +(performance.now() - t).toFixed(1); };
    const frame = async () => one();
    const mk = (shape, substrate, name, extra = {}) => ({ ...pd.designToJSON(), shape, substrate, name, ...extra });
    const names = [['swirl', 'Amethyst'], ['solid', 'Bone'], ['metal', 'Gold'], ['marble', 'Marble'], ['epoxy', 'Resin'], ['glass', 'Glass']].filter(([s]) => pd.SUBSTRATES[s]);
    const designs = names.map(([s, n], i) => ({ id: n.toLowerCase(), name: n, design: mk('d20', s, n, { filigree: i === 1 ? { style: 'scroll', filled: true } : undefined }) }));
    await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'P', designs, active: { design: designs[0].id } }, { replace: true });
    const r = { substrates: names.map(n => n[0]) };
    one(); r.baseline = { memory: pd.memory() };
    // 1. switching designs (what the shelf does): cold, then warm
    r.switch = [];
    for (const d of [...designs, ...designs]) r.switch.push({ to: d.id, ms: await T(() => pd.bagActivate(d.id)), mem: (one(), JSON.stringify(pd.memory())) });
    // 2. raw build cost of one die of each shape (the atlas + geometry + material work)
    r.shapes = {};
    for (const sh of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'set7']) { pd.state.shape = sh; r.shapes[sh] = await T(() => pd.buildDice()); }
    // 3. sets: N identical dice vs the same dice mixing designs
    const setMs = async (notation) => { pd.state.shape = 'custom'; pd.state.notation = notation; const ms = await T(() => pd.buildDice()); const first = one(), f = one(), m = pd.memory(); return { ms, first, frame: f, dice: pd.dice.length, textures: m.textures, geometries: m.geometries, programs: m.programs }; };
    await pd.bagActivate(designs[0].id);
    r.sets = { same10: await setMs('10d6'), same20: await setMs('20d6'), same20d20: await setMs('20d20') };
    const ids = designs.slice(0, 4).map(d => d.id);
    r.sets.mixed10 = await setMs(`3d6@${ids[0]}+3d6@${ids[1]}+2d6@${ids[2]}+2d6@${ids[3]}`);
    r.sets.mixed20 = await setMs(`5d20@${ids[0]}+5d20@${ids[1]}+5d20@${ids[2]}+5d20@${ids[3]}`);
    // 3b. every substrate on its own: build, first frame (shader compile) and steady frame cost, for one d20 and for ten d6
    r.substrate = {};
    const avgFrame = async n => { let t = 0; for (let i = 0; i < n; i++) t += one(); return +(t / n).toFixed(1); };
    for (const sub of Object.keys(pd.SUBSTRATES)) {
      const row = {};
      for (const [label, shape, notation] of [['d20', 'd20', null], ['10d6', 'custom', '10d6']]) {
        pd.state.substrate = sub; pd.state.shape = shape; if (notation) pd.state.notation = notation;
        row[label + '_build'] = await T(() => pd.buildDice());
        row[label + '_first'] = one(); row[label + '_programs'] = pd.memory().programs;
        row[label + '_frame'] = await avgFrame(5);
      }
      r.substrate[sub] = row;
    }
    // 4. rebuilding the same set again (a slider drag or switch that rebuilds)
    r.rebuild20d20 = await T(() => pd.buildDice());
    return r;
  });
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); server.kill(); }
