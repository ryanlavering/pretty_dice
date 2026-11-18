// Records or compares the byte sizes of the two single-file builds (part of the 4.1 golden set, docs/design/v41-baseline.md).
//   node scripts/golden-build.mjs            compare with tests/golden/build.json (prints each change; exit 1 if any)
//   node scripts/golden-build.mjs record     rewrite tests/golden/build.json
// A factoring step may legitimately change the sizes (module wrappers in the bundle); each change is explained in v41-baseline.md.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url)), file = path.join(root, 'tests/golden/build.json'), now = {};
for (const [flag, out] of [['--artifact', 'dist/pretty-dice-artifact.html'], [null, 'dist/pretty-dice-offline.html']]) {
  execFileSync('python3', [path.join(root, 'scripts/build-static.py'), ...(flag ? [flag] : [])], { cwd: root, stdio: 'pipe' });
  const buf = readFileSync(path.join(root, out));
  now[out] = { bytes: statSync(path.join(root, out)).size, sha256: createHash('sha256').update(buf).digest('hex').slice(0, 16) };
}
if (process.argv[2] === 'record' || !existsSync(file)) { writeFileSync(file, JSON.stringify(now, null, 1) + '\n'); console.log('recorded', now); process.exit(0); }
const was = JSON.parse(readFileSync(file, 'utf8')); let diff = 0;
for (const k of Object.keys(now)) {
  if (now[k].bytes !== was[k]?.bytes || now[k].sha256 !== was[k]?.sha256) { diff++; console.log(`${k}: ${was[k]?.bytes} -> ${now[k].bytes} bytes (${now[k].bytes - (was[k]?.bytes || 0)}), sha ${was[k]?.sha256} -> ${now[k].sha256}`); }
  else console.log(`${k}: same (${now[k].bytes} bytes)`);
}
process.exit(diff ? 1 : 0);
