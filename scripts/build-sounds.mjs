// Builds the sample sets in sounds/ from downloaded CC0 source packs (PD-114). Not run by the app or CI; run it when sources change.
//   FFMPEG=/path/to/ffmpeg node scripts/build-sounds.mjs <sources-dir>
// <sources-dir> holds: kenney/ (Kenney Casino Audio, *.ogg), dice29/ (OpenGameArt "2 dice roll (29 throws)", *.wav), wood/ (OpenGameArt "Wooden dice on wooden table roll", *.flac).
// Whole throws are cut into single impacts by onset detection. Each clip keeps its level relative to its source file (db <= 0), so quiet hits stay quiet and the app can
// pick a clip that matches the impact speed. Output: mono 44.1 kHz 16-bit WAV (no codec delay, plays everywhere), one manifest per set, and candidates.json for the audition page.
import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const SR = 44100, FFMPEG = process.env.FFMPEG || 'ffmpeg', src = process.argv[2];
if (!src) { console.error('usage: node scripts/build-sounds.mjs <sources-dir>'); process.exit(1); }

const decode = f => { const r = spawnSync(FFMPEG, ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.status) throw new Error('ffmpeg failed on ' + f); const b = r.stdout; return new Float32Array(b.buffer, b.byteOffset, b.length >> 2).slice(); };
const db = x => 20 * Math.log10(Math.max(x, 1e-9));
const files = (d, ext) => readdirSync(join(src, d)).filter(f => ext.includes(extname(f).toLowerCase())).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(f => join(src, d, f));

/** Cut a recording into single impacts. Returns [{data, db, bright, at}] where db is the clip's peak relative to the file's loudest peak. */
function slice(x) {
  const B = Math.round(SR * .002), nb = Math.floor(x.length / B), lv = new Float32Array(nb);
  for (let i = 0; i < nb; i++) { let s = 0; for (let k = 0; k < B; k++) s += x[i * B + k] ** 2; lv[i] = db(Math.sqrt(s / B)); }
  let filePeak = 0; for (const v of x) filePeak = Math.max(filePeak, Math.abs(v));
  const top = Math.max(...lv), out = []; let lastOn = -99;
  for (let i = 4; i < nb - 2; i++) {
    const before = Math.min(lv[i - 1], lv[i - 2], lv[i - 3], lv[i - 4]);
    if (lv[i] - before < 10 || lv[i] < top - 38 || i - lastOn < 22) continue;      // not a jump / too quiet / within 44 ms of the last hit
    lastOn = i; let s0 = i * B, pk = 0, pkAt = s0;
    for (let k = s0; k < Math.min(x.length, s0 + SR * .015); k++) if (Math.abs(x[k]) > pk) { pk = Math.abs(x[k]); pkAt = k; }
    s0 = Math.max(0, s0 - Math.round(SR * .003));
    let j = Math.floor(pkAt / B), end = j; while (end < nb - 1 && lv[end] > db(pk) - 30 && (end - j) * B < SR * .22 && !(end > j + 6 && lv[end] - lv[end - 1] > 10)) end++;
    const e0 = Math.min(x.length, Math.max(end * B, s0 + Math.round(SR * .04)));
    if ((e0 - s0) < SR * .025) continue;
    let d = x.slice(s0, e0);
    // trim the lead-in: start at the first sample within 24 dB of the clip's own peak (minus 0.7 ms), so every clip sounds at the instant it is started
    let cp = 0; for (const v of d) cp = Math.max(cp, Math.abs(v)); const thr = cp * 10 ** (-24 / 20); let i0 = 0; while (i0 < d.length && Math.abs(d[i0]) < thr) i0++;
    d = d.slice(Math.max(0, i0 - Math.round(SR * .0007)));
    const fo = Math.round(SR * .006); for (let k = 0; k < fo && k < d.length; k++) d[d.length - 1 - k] *= k / fo;
    for (let k = 0; k < 16; k++) d[k] *= k / 16;   // 0.35 ms fade-in: no click
    let zc = 0; const n20 = Math.min(d.length, Math.round(SR * .02)); for (let k = 1; k < n20; k++) if ((d[k] >= 0) !== (d[k - 1] >= 0)) zc++;
    let pk2 = 0; for (const v of d) pk2 = Math.max(pk2, Math.abs(v)); let l = 0; while (l < d.length && Math.abs(d[l]) < pk2 * .1) l++;
    out.push({ data: d, db: db(pk / filePeak), bright: Math.round(zc / (n20 / SR) / 2), at: s0 / SR, lead: +(l / SR * 1000).toFixed(2) });
  }
  return { clips: out, filePeak };
}
const wav = (d, gain) => { const b = Buffer.alloc(44 + d.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + d.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(d.length * 2, 40);
  for (let i = 0; i < d.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(d[i] * gain * 32767))), 44 + i * 2); return b; };

const peaksOf = (d, n = 40) => { const step = Math.ceil(d.length / n), out = []; let top = 1e-9;   // 40 amplitude bars for the audition page's waveform thumbnails
  for (let i = 0; i < n; i++) { let m = 0; for (let k = i * step; k < Math.min(d.length, (i + 1) * step); k++) m = Math.max(m, Math.abs(d[k])); out.push(m); top = Math.max(top, m); } return out.map(v => +(v / top).toFixed(2)); };
const cutCache = new Map(); const cut = f => { if (!cutCache.has(f)) cutCache.set(f, slice(decode(f))); return cutCache.get(f); };
const usable = c => !(c.data.length < SR * .035 || c.db < -34 || c.lead > 3);   // too short / too quiet / slow attack (>3 ms to reach -20 dB: not a crisp hit, it would sound late)

/** "Clackiness" 0..1 (1 = the sharpest, brightest, driest click). Four cheap features, standardised over every usable clip from every source, weighted and rank-normalised.
 *  Rough on purpose: the app adds its own randomness, so a good ordering matters more than an exact number. */
function features(d) { let e = 1e-12, de = 0, lf = 0, y = 0; const a = 1 - Math.exp(-2 * Math.PI * 500 / SR);
  for (let i = 0; i < d.length; i++) { e += d[i] * d[i]; if (i) de += (d[i] - d[i - 1]) ** 2; y += a * (d[i] - y); lf += y * y; }
  return [Math.log(de / e + 1e-3), 0, Math.log(d.length / SR * 1000), lf / e]; }          // [high-frequency share, (filled in below), decay length, low-frequency (thud) share]
function rankClack(allClips) {
  allClips.forEach(c => { const f = features(c.data); f[1] = Math.log(c.bright); c.f = f; });
  const W = [1, .7, -.5, -.8], n = allClips.length, mean = [0, 0, 0, 0], sd = [0, 0, 0, 0];
  allClips.forEach(c => c.f.forEach((v, i) => mean[i] += v / n)); allClips.forEach(c => c.f.forEach((v, i) => sd[i] += (v - mean[i]) ** 2 / n)); sd.forEach((v, i) => sd[i] = Math.sqrt(v) || 1);
  allClips.forEach(c => { c.raw = c.f.reduce((t, v, i) => t + W[i] * (v - mean[i]) / sd[i], 0); });
  const sorted = [...allClips].sort((a, b) => a.raw - b.raw); sorted.forEach((c, i) => { c.clack = +(i / Math.max(1, n - 1)).toFixed(3); }); }

const cand = [];            // everything the audition page lists
/** Keep at most `cap` clips, spread evenly over the loudness range (so there are soft, medium and hard hits), preferring clips of a usable length. */
const spread = (list, cap) => { if (list.length <= cap) return list; const s = [...list].sort((a, b) => a.c.db - b.c.db), out = [];
  for (let i = 0; i < cap; i++) out.push(s[Math.floor((i + .5) * s.length / cap)]); return out; };
function build(id, groups, caps) {
  const dir = join('sounds', id); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const man = { trim: 1, impact: { dice: [], table: [] }, meta: {} }, pool = { dice: [], table: [] };
  for (const g of groups) for (const f of g.files) {
    const { clips, filePeak } = cut(f), base = g.prefix + '-' + basename(f, extname(f)).replace(/[^a-z0-9]+/gi, '').toLowerCase();
    clips.forEach((c, i) => { if (!usable(c)) return;   // too short to be a clean hit / too quiet to matter
      pool[c.bright > 3000 ? 'dice' : 'table'].push({ c, g, f, filePeak, name: `${base}-${i + 1}.wav` }); });   // brighter and drier = die on die; duller = die on the mat (a guess: confirm by ear in the audition page)
  }
  for (const role of ['dice', 'table']) for (const { c, g, f, filePeak, name } of spread(pool[role], caps[role])) {
    writeFileSync(join(dir, name), wav(c.data, .9 / filePeak));   // the source file's loudest peak maps to 0.9 full scale; quieter hits stay proportionally quieter
    man.impact[role].push(name); man.meta[name] = { db: +c.db.toFixed(1), clack: c.clack };
    cand.push({ set: id, file: `${id}/${name}`, role, source: g.source, from: basename(f), db: +c.db.toFixed(1), bright: c.bright, ms: Math.round(c.data.length / SR * 1000), lead: c.lead, clack: c.clack, peaks: peaksOf(c.data) });
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(man, null, 1));
  console.log(id, 'dice', man.impact.dice.length, 'table', man.impact.table.length);
}
const K = 'Kenney Casino Audio (CC0)', D = 'OpenGameArt: 2 dice roll, 29 throws (CC0)', W = 'OpenGameArt: Wooden dice on wooden table roll (CC0)';
const kf = files('kenney', ['.ogg']).filter(f => /die-throw|dice-throw/.test(f)), kChip = files('kenney', ['.ogg']).filter(f => /chips-collide|chip-lay/.test(f));
{ const all = []; for (const f of [...kf, ...kChip, ...files('dice29', ['.wav']), ...files('wood', ['.flac'])]) for (const c of cut(f).clips) if (usable(c)) all.push(c);   // pre-pass: rank clack over every source
  rankClack(all); console.log('clack ranked over', all.length, 'clips'); }
build('kenney', [{ prefix: 'k', source: K, files: kf }, { prefix: 'kc', source: K + ' (chip sounds, as hard clacks)', files: kChip }], { dice: 10, table: 16 });
build('best', [{ prefix: 'd29', source: D, files: files('dice29', ['.wav']) }, { prefix: 'w', source: W, files: files('wood', ['.flac']) }, { prefix: 'k', source: K, files: kf }], { dice: 24, table: 36 });
writeFileSync('sounds/candidates.json', JSON.stringify(cand));

