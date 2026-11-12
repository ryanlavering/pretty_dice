// Sound backends (PD-114): the app calls one API; the active backend (classic / proc / kenney / best) can be switched live.
// Headless Chromium keeps the AudioContext suspended, so these check wiring (voices created, no errors, state saved), not audibility.
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

test('boots on the classic synth and every backend plays without errors', async ({ app, page }) => {
  await mockSet(page, 'kenney', { impact: { dice: ['a.wav'], table: ['a.wav'] }, chime: ['a.wav'], fumble: ['a.wav'], roll: 'a.wav' });
  await mockSet(page, 'best', { impact: {}, chime: [] });   // a set with no clips falls back to the procedural synth per role
  await app.open();
  expect(await app.run(pd => pd.soundBackend)).toBe('classic');
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
