// 4.1 factoring tool (docs/design/v41-factoring-plan.md). Needs acorn + eslint-scope outside the repo (not app or test deps):
//   npm i --no-save --prefix /tmp/pdfactor acorn eslint-scope      (or set PD_FACTOR_LIBS to another prefix)
import { createRequire } from 'node:module';
const __req = createRequire((process.env.PD_FACTOR_LIBS || '/tmp/pdfactor') + '/node_modules/');
const acorn = __req('acorn'), eslintScope = __req('eslint-scope');
// Scope analysis of the main module in index.html (or a src file): which top-level names each section declares, uses from others, and who uses them.
// usage: node deps.mjs <index.html> [--section N] [--names]
import fs from 'node:fs';

const [file, ...args] = process.argv.slice(2);
const html = fs.readFileSync(file, 'utf8');
let src, lineOff = 0;
if (file.endsWith('.html')) {
  const start = html.indexOf('<script type="text/plain" id="main-src">'), body = html.indexOf('\n', start) + 1, end = html.indexOf('</script>', body);
  src = html.slice(body, end); lineOff = html.slice(0, body).split('\n').length - 1;
} else src = html;
const ast = acorn.parse(src, { ecmaVersion: 2024, sourceType: 'module', locations: true, ranges: true });
const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
const mod = sm.globalScope.childScopes.find(s => s.type === 'module');
// sections by marker comments
const lines = src.split('\n'), sections = [];
lines.forEach((l, i) => { if (/^\s*\/\* ?-{4,}|^\/\/ -{4,}/.test(l)) sections.push({ line: i + 1, name: l.replace(/[\/*\-]/g, ' ').trim().slice(0, 50) }); });
sections.unshift({ line: 1, name: 'imports' });
const secOf = line => { let s = 0; for (let i = 0; i < sections.length; i++) if (sections[i].line <= line) s = i; return s; };
const decl = {}, uses = {};   // name -> section ; section -> {from section -> Set(names)}
for (const v of mod.variables) {
  const d = v.defs[0]; if (!d) continue; const s = secOf(d.name.loc.start.line); decl[v.name] = s;
  for (const r of v.references) { const rs = secOf(r.identifier.loc.start.line); if (rs === s) continue;
    ((uses[rs] ??= {})[s] ??= new Set()).add(v.name + (r.isWrite() ? '(w)' : '')); }
}
const which = args.includes('--section') ? +args[args.indexOf('--section') + 1] : null;
sections.forEach((sec, i) => {
  if (which !== null && which !== i) return;
  const declared = Object.keys(decl).filter(n => decl[n] === i);
  const inn = uses[i] || {}, out = {};
  for (const [rs, m] of Object.entries(uses)) if (m[i]) out[rs] = m[i];
  const nIn = Object.values(inn).reduce((a, s) => a + s.size, 0), nOut = Object.values(out).reduce((a, s) => a + s.size, 0);
  console.log(`[${i}] L${sec.line + lineOff} ${sec.name}: declares ${declared.length}, uses ${nIn} names from ${Object.keys(inn).length} sections, used ${nOut}x by ${Object.keys(out).length} sections`);
  if (which !== null || args.includes('--names')) {
    for (const [s, set] of Object.entries(inn)) console.log(`   uses from [${s}] ${sections[s].name}: ${[...set].join(' ')}`);
    for (const [s, set] of Object.entries(out)) console.log(`   used by [${s}] ${sections[s].name}: ${[...set].join(' ')}`);
  }
});
const through = new Set(mod.through.map(r => r.identifier.name));
if (args.includes('--globals')) console.log('free (globals):', [...through].sort().join(' '));
