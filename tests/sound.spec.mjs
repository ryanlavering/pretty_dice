// Sound backends (PD-114): the app calls one API; the active backend (classic / proc / kenney / best) can be switched live.
// Headless Chromium keeps the AudioContext suspended, so these check wiring (voices created, no errors, state saved), not audibility.
import { readFileSync } from 'node:fs';
import { test, expect } from './helpers/app.mjs';

/** A tiny valid 16-bit mono WAV (a 20 ms click) for mocked sample sets. */
const wav = () => {
  const n = 882, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(12000 * Math.sin(i / 3) * (1 - i / n)), 44 + i * 2);
  return b;
};
const mockSet = async (page, id, manifest) => {
  await page.route(`**/sounds/${id}/manifest.json`, r => r.fulfill({ json: manifest }));
  await page.route(`**/sounds/${id}/*.wav`, r => r.fulfill({ body: wav(), contentType: 'audio/wav' }));
};
const hear = (pd, id) => {   // one of everything through backend id; returns voices created
  pd.audioInit(); pd.setSoundBackend(id); const b = pd.SB[id], v0 = pd.sfx.voices;
  b.impact(9, 'table'); b.impact(9, 'dice'); b.chime(1); b.fumble(); b.rumble(12); b.rumble(0);
  return { id: pd.soundBackend, voices: pd.sfx.voices - v0 };
};

test('boots on the blend and every backend plays without errors', async ({ app, page }) => {
  await mockSet(page, 'kenney', { impact: { dice: ['a.wav'], table: ['a.wav'] }, chime: ['a.wav'], fumble: ['a.wav'], roll: 'a.wav' });
  await mockSet(page, 'best', { impact: {}, chime: [] });   // a set with no clips falls back to the procedural synth per role
  await app.open();
  expect(await app.run(pd => pd.soundBackend)).toBe('mix');
  for (const id of ['classic', 'proc', 'kenney', 'best']) {
    if (id === 'kenney' || id === 'best') await page.waitForFunction(id => window.__pd.SB[id].state !== 'loading', id).catch(() => {});
    const r = await app.run(hear, id);
    expect(r.id).toBe(id); expect(r.voices, `${id}: sounds were made`).toBeGreaterThanOrEqual(3);
  }
});

test('sample backend loads its manifest and clips', async ({ app, page }) => {
  await mockSet(page, 'kenney', { trim: 0.8, impact: { dice: ['a.wav'], table: ['a.wav'] }, roll: 'a.wav' });
  await app.open();
  await app.run(pd => { pd.audioInit(); pd.setSoundBackend('kenney'); });
  await page.waitForFunction(() => window.__pd.SB.kenney.state === 'ready');
  expect(await app.run(pd => ({ n: Object.keys(pd.SB.kenney.bufs).length, trim: pd.SB.kenney.trim, gain: pd.sfx.trim.gain.value }))).toEqual({ n: 1, trim: 0.8, gain: expect.closeTo(0.8, 5) });
});

test('a broken sample set degrades to the procedural synth', async ({ app, page }) => {
  await page.route('**/sounds/kenney/**', r => r.fulfill({ body: 'not json' }));   // a broken set (a real 404 would be logged by the browser as a console error)
  await app.open();
  await app.run(pd => { pd.audioInit(); pd.setSoundBackend('kenney'); });
  await page.waitForFunction(() => window.__pd.SB.kenney.state === 'failed');
  expect((await app.run(hear, 'kenney')).voices).toBeGreaterThanOrEqual(2);
});

test('the choice persists, can be preset with ?sound=, and the dropdown drives it', async ({ app, page }) => {
  await app.open({ query: 'sound=proc' });
  expect(await app.run(pd => pd.soundBackend)).toBe('proc');
  await page.selectOption('#sndbk', 'classic');
  expect(await app.run(pd => pd.soundBackend)).toBe('classic');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prettydice.v1')).soundBk)).toBe('classic');
});

test('blend backend plays both ways and the slider extremes pick one set', async ({ app, page }) => {
  await mockSet(page, 'kenney', { impact: { dice: ['a.wav'], table: ['a.wav'] } });
  await mockSet(page, 'best', { impact: { dice: ['a.wav'], table: ['a.wav'] } });
  await app.open();
  await app.run(pd => { pd.audioInit(); pd.setSoundBackend('mix'); });
  await page.waitForFunction(() => window.__pd.SB.kenney.state === 'ready' && window.__pd.SB.best.state === 'ready');
  const count = (mix, mode) => app.run((pd, [mix, mode]) => { pd.state.soundMix = mix; pd.state.soundMixMode = mode; const calls = { kenney: 0, best: 0 };
    for (const id of ['kenney', 'best']) { const o = pd.SB[id].impact; pd.SB[id].impact = (...a) => { calls[id]++; return o.apply(pd.SB[id], a); }; }
    for (let i = 0; i < 40; i++) pd.SB.mix.impact(9, 'table'); return calls; }, [mix, mode]);
  expect(await count(0, 'random')).toEqual({ kenney: 0, best: 40 });
  expect(await count(1, 'random')).toEqual({ kenney: 40, best: 0 });
  const mid = await count(0.5, 'random');   expect(mid.kenney).toBeGreaterThan(5); expect(mid.best).toBeGreaterThan(5);
  const both = await count(0.5, 'layer'); expect(both.kenney).toBeGreaterThan(0); expect(both.best).toBeGreaterThan(0);
});

test('the limiter keeps a pile of overlapping full-scale hits at or below 1.0', async ({ app }) => {
  await app.open();
  const peaks = await app.run(async pd => {
    const render = async limited => { const sr = 44100, off = new OfflineAudioContext(1, sr, sr), b = off.createBuffer(1, 2000, sr), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.exp(-i / 800);   // a full-scale one-sided pulse (not an alternating click: starts fall between samples and would cancel it)
      const out = limited ? pd.makeLimiter(off) : null; if (out) out.output.connect(off.destination);
      for (let k = 0; k < 30; k++) { const s = off.createBufferSource(); s.buffer = b; s.connect(limited ? out.input : off.destination); s.start(k * 0.004); }
      const r = await off.startRendering(), x = r.getChannelData(0); let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); return m; };
    return { raw: await render(false), limited: await render(true) };
  });
  expect(peaks.raw, 'without a limiter the sum clips').toBeGreaterThan(1.5);
  expect(peaks.limited, 'with it, it does not').toBeLessThanOrEqual(1.0001);
});

test('pair hardness: hard materials ask for clacky clips, soft ones for dull clips', async ({ app, page }) => {
  const clips = Array.from({ length: 12 }, (_, i) => `c${i}.wav`), meta = Object.fromEntries(clips.map((f, i) => [f, { db: 0, clack: +(i / 11).toFixed(3) }]));
  await mockSet(page, 'kenney', { impact: { dice: clips.slice(0, 6), table: clips.slice(6) }, meta });
  await app.open();
  await app.run(pd => { pd.audioInit(); pd.setSoundBackend('kenney'); });
  await page.waitForFunction(() => window.__pd.SB.kenney.state === 'ready');
  const mean = (sub, surf, kind) => app.run((pd, [sub, surf, kind]) => { pd.state.substrate = sub; pd.state.surfaceMat = surf; const b = pd.SB.kenney; let t = 0;
    for (let i = 0; i < 40; i++) { b.impact(9, kind); t += b.man.meta[b.lastPick].clack; } return t / 40; }, [sub, surf, kind]);
  const stoneOnGlass = await mean('marble', 'glass', 'table'), plasticOnFelt = await mean('swirl', 'felt', 'table');
  expect(stoneOnGlass, 'stone die on glass').toBeGreaterThan(0.75); expect(plasticOnFelt, 'plastic die on felt').toBeLessThan(0.25);
  expect(await mean('marble', 'felt', 'table'), 'a soft partner dominates').toBeLessThan(0.45);
  expect(await mean('metal', 'glass', 'dice'), 'metal die on metal die').toBeGreaterThan(0.75);
  const h = await app.run(pd => { pd.state.substrate = 'marble'; pd.state.surfaceMat = 'glass'; const a = Array.from({ length: 50 }, () => pd.hardnessFor('table', 9)); return { min: Math.min(...a), max: Math.max(...a) }; });
  expect(h.max - h.min, 'random wobble is present').toBeGreaterThan(0.05);
});

test('the tuning tool boots from the served repo and lists the clips', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/tools/sound-audition.html');
  await page.waitForSelector('.clip');
  expect(await page.locator('.clip').count(), 'clips listed').toBeGreaterThan(10);
  await page.selectOption('#sortby', 'clack');
  const clacks = await page.locator('.clip .meta').evaluateAll(els => els.map(e => +e.textContent.match(/clack ([\d.]+)/)[1]));
  expect(clacks, 'clackiest first').toEqual([...clacks].sort((a, b) => b - a));
  expect(errors).toEqual([]);
});

test('the tuning tool uses the same material hardness table as the app', async () => {
  for (const name of ['MAT_HARD', 'RING', 'GLASS_FM']) {
    const table = f => readFileSync(f, 'utf8').match(new RegExp(`const ${name}=(\\{[^}]*\\}|\\[\\[[\\d.,\\[\\]]*\\]\\])`))[1].replace(/\s+/g, '');
    expect(table('tools/sound-audition.html'), name).toBe(table('index.html'));
  }
});

test('metal and glass ring: only metal or glass pairings ring; strength follows impact speed; the slider scales it', async ({ app }) => {
  await app.open();
  const r = await app.run(pd => { pd.audioInit(); const ring = (sub, surf, kind, amt = 1, speed = 14) => { pd.state.substrate = sub; pd.state.surfaceMat = surf; pd.state.ringLevel = amt; pd.sfx.rings = 0; return pd.ringFor(kind, speed); };   // rings = 0: the app caps simultaneous rings at 8, and this test fires many at once
    return { plasticFelt: ring('swirl', 'felt', 'table'), plasticGlass: ring('swirl', 'glass', 'table'), metalFelt: ring('metal', 'felt', 'table'), metalDie: ring('metal', 'felt', 'dice'),
      plasticGlassDice: ring('swirl', 'glass', 'dice'), off: ring('metal', 'glass', 'table', 0), half: ring('metal', 'glass', 'table', 0.5), full: ring('metal', 'glass', 'table', 1),
      soft: ring('metal', 'glass', 'table', 1, 2.5), mid: ring('metal', 'glass', 'table', 1, 7), hard: ring('metal', 'glass', 'table', 1, 14) }; });
  expect(r.plasticFelt, 'plastic on felt: no ring').toBe(0);
  expect(r.plasticGlass, 'plastic on glass: glass rings').toBeGreaterThan(0);
  expect(r.metalFelt, 'metal die on felt: metal rings').toBeGreaterThan(0);
  expect(r.metalDie, 'metal die on die rings').toBeGreaterThan(0);
  expect(r.plasticGlassDice, 'the glass surface is not involved in die on die').toBe(0);
  expect(r.off, 'slider at 0 turns it off').toBe(0);
  expect(r.full, 'slider scales the strength').toBeGreaterThan(r.half * 1.3);
  expect(r.soft, 'always applied, even to a soft tap').toBeGreaterThan(0);
  expect(r.soft, 'soft < mid < hard: proportional to speed').toBeLessThan(r.mid); expect(r.mid).toBeLessThan(r.hard);
  expect(r.hard, 'metal and glass together are stronger than metal alone').toBeGreaterThan(r.metalFelt);
});

test('glass ring sources: samples, FM, both and additive each make sound; samples load', async ({ app, page }) => {
  await app.open();
  await app.run(pd => pd.audioInit());
  await page.waitForFunction(() => window.__pd.ringBuf.state === 'ready');
  const r = await app.run(pd => { pd.state.substrate = 'swirl'; pd.state.surfaceMat = 'glass'; pd.state.ringLevel = 1; const out = { clips: pd.ringBuf.glass.length };
    for (const src of ['sample', 'fm', 'both', 'add']) { pd.state.glassSrc = src; pd.sfx.rings = 0; const s = pd.ringFor('table', 14); out[src] = { strength: s, voices: pd.sfx.rings }; } return out; });
  expect(r.clips, 'glass clips decoded').toBeGreaterThan(5);
  for (const src of ['sample', 'fm', 'both', 'add']) { expect(r[src].strength, src).toBeGreaterThan(0); expect(r[src].voices, `${src} voices`).toBeGreaterThan(0); }
  expect(r.both.voices, 'both = samples + FM').toBe(2);
});
