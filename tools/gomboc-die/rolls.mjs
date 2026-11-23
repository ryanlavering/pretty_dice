// Roll harness for the experimental gomboc d1: node tools/gomboc-die/rolls.mjs [N=20] [rule=1|0] [startSeed=1] [shot=path.png]
// Boots the app on a local server (port 8131), reseeds and runs N simRolls, prints one line per roll and a summary.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const [N = 20, rule = 1, s0 = 1, shot = ''] = process.argv.slice(2).map((a, i) => i === 3 ? a : +a);
const base = 'http://127.0.0.1:8131';
const server = spawn(process.execPath, [new URL('../../scripts/serve.mjs', import.meta.url).pathname, '8131'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[${m.type()}] ${m.text()}`); });
  await page.goto(`${base}/index.html?libs=local&seed=${s0}&shape=gomboc172&lite`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 90_000 });
  const rows = await page.evaluate(async ([N, rule, s0]) => {
    const pd = window.__pd; pd.gombocRule = !!rule; const out = [];
    for (let k = 0; k < N; k++) {
      pd.reseed(s0 + k); const t0 = performance.now(), st0 = pd.gombocStalls; let r = pd.simRoll({ maxSteps: 4000 }); for (let g = 0; pd.rrStall && g < 8; g++) { pd.rerollNow(); pd.step(4000); r = { ...r, settled: pd.settled, simT: pd.rollT, dice: pd.faces.map(l => ({ label: l })), pendingReroll: pd.rrPending || [], freeTries: pd.freeTries }; }   // a stall waits for an explicit re-roll
      const b = pd.bodies[0], d = pd.dice[0];
      const q = b.quaternion, n = d.faces[d.sIdx].n.clone().applyQuaternion(new pd.camera.quaternion.constructor(q.x, q.y, q.z, q.w));
      out.push({ seed: s0 + k, label: r.dice[0] && r.dice[0].label, settled: r.settled, simT: +r.simT.toFixed(2), firstLeans: r.firstLeans, leans: r.leans, freeTries: r.freeTries, angS: +(Math.acos(Math.max(-1, Math.min(1, -n.y))) * 180 / Math.PI).toFixed(2), speed: +b.velocity.length().toFixed(3), spin: +b.angularVelocity.length().toFixed(3), y: +b.position.y.toFixed(3), sleep: b.sleepState, stalls: pd.gombocStalls - st0, pending: r.pendingReroll.length, ms: Math.round(performance.now() - t0) });
    }
    return out;
  }, [N, rule, s0]);
  for (const r of rows) console.log(JSON.stringify(r));
  const on = rows.filter(r => r.label === 1).length, ts = rows.map(r => r.simT).sort((a, b) => a - b);
  console.log(`SUMMARY rule=${rule} n=${rows.length} onS=${on} settled=${rows.filter(r => r.settled).length} anyLean=${rows.filter(r => r.firstLeans).length} medianT=${ts[ts.length >> 1]} maxT=${ts[ts.length - 1]} withFreeTries=${rows.filter(r => r.freeTries).length} rollsWithStall=${rows.filter(r => r.stalls).length} totalStalls=${rows.reduce((a, r) => a + r.stalls, 0)}`);
  if (shot) { await page.evaluate(() => { const pd = window.__pd; pd.resume(); }); await page.waitForTimeout(800); await page.screenshot({ path: shot }); }
} finally { await browser.close(); server.kill(); }
