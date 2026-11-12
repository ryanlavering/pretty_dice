// Builds the self-contained copy of tools/sound-audition.html (all clips embedded as base64) for publishing as an Artifact or opening from a file.
//   node scripts/build-sound-audition.mjs [out.html]      default: dist/sound-audition-artifact.html (git-ignored)
// Served from the repo (python3 -m http.server 8123 -> /tools/sound-audition.html) the page needs no build: it reads sounds/candidates.json and the clips directly.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] || 'dist/sound-audition-artifact.html', tpl = readFileSync('tools/sound-audition.html', 'utf8');
if (!tpl.includes('/*DATA*/')) throw new Error('tools/sound-audition.html lost its /*DATA*/ marker');
const clips = JSON.parse(readFileSync('sounds/candidates.json', 'utf8')), b64 = {};
for (const c of clips) b64[c.file] = readFileSync('sounds/' + c.file).toString('base64');
const ring = JSON.parse(readFileSync('sounds/ring/manifest.json', 'utf8')).glass; for (const f of ring) b64['ring/' + f] = readFileSync('sounds/ring/' + f).toString('base64');   // glass ring clips
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, tpl.replace('/*DATA*/', () => 'window.EMBED=' + JSON.stringify({ clips, b64, ring }) + ';'));
console.log(`wrote ${out}: ${clips.length} clips, ${(readFileSync(out).length / 1e6).toFixed(2)} MB`);
