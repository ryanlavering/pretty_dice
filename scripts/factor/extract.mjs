// 4.1 factoring tool (docs/design/v41-factoring-plan.md). Needs acorn + eslint-scope outside the repo (not app or test deps):
//   npm i --no-save --prefix /tmp/pdfactor acorn eslint-scope      (or set PD_FACTOR_LIBS to another prefix)
import { createRequire } from 'node:module';
const __req = createRequire((process.env.PD_FACTOR_LIBS || '/tmp/pdfactor') + '/node_modules/');
const acorn = __req('acorn'), eslintScope = __req('eslint-scope');
// Move line ranges of the main module into src/<name>.js as an ES module, wiring imports both ways. Refuses when the block
// needs a name that stays in main (that needs an explicit injection, decided by hand).
// usage: node extract.mjs <repo> <name> <a-b>[,<c-d>...] [--dry] [--header "comment"]
import fs from 'node:fs';
import path from 'node:path';

const [repo, name, rangesArg, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry'), header = rest.includes('--header') ? rest[rest.indexOf('--header') + 1] : `src/${name}.js`;
const mainFile = fs.existsSync(path.join(repo, 'src/main.js')) ? path.join(repo, 'src/main.js') : path.join(repo, 'index.html');
const file = fs.readFileSync(mainFile, 'utf8'), lines = file.split('\n');
const ranges = rangesArg.split(',').map(r => { const [a, b] = r.split('-').map(Number); return [a, b ?? a]; });
const inBlock = i => ranges.some(([a, b]) => i + 1 >= a && i + 1 <= b);
const block = lines.filter((_, i) => inBlock(i)).join('\n'), rest_ = lines.filter((_, i) => !inBlock(i));
// main module text of the remaining file
const mainOf = ls => { const t = ls.join('\n'); if (!mainFile.endsWith('.html')) return { text: t, off: 0 };
  const s = t.indexOf('<script type="text/plain" id="main-src">'), b = t.indexOf('\n', s) + 1, e = t.indexOf('</script>', b); return { text: t.slice(b, e), off: b }; };
const analyze = text => { const ast = acorn.parse(text, { ecmaVersion: 2024, sourceType: 'module', locations: true, ranges: true });
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' }); return { ast, mod: sm.globalScope.childScopes.find(s => s.type === 'module') }; };
const blk = analyze(block), declared = blk.mod.variables.map(v => v.name);
const lets = blk.mod.variables.filter(v => v.defs[0]?.parent?.kind === 'let' || v.defs[0]?.parent?.kind === 'var').map(v => v.name);
const blkThrough = [...new Set(blk.mod.through.map(r => r.identifier.name))];
const m = mainOf(rest_), mainA = analyze(m.text);
const mainDecl = new Set(mainA.mod.variables.map(v => v.name));
const mainImports = mainA.ast.body.filter(n => n.type === 'ImportDeclaration');
const extNames = {}; for (const d of mainImports) if (!d.source.value.startsWith('./')) for (const s of d.specifiers) extNames[s.local.name] = m.text.slice(d.start, d.end);
// exports of existing src modules
const srcExports = {}; const srcDir = path.join(repo, 'src');
if (fs.existsSync(srcDir)) for (const f of fs.readdirSync(srcDir).filter(f => f.endsWith('.js') && f !== 'main.js' && f !== name + '.js'))
  for (const mm of fs.readFileSync(path.join(srcDir, f), 'utf8').matchAll(/^export (?:const|function|class|async function) (\w+)/gm)) srcExports[mm[1]] = f.replace('.js', '');
const fromMain = [], needExt = new Set(), needSrc = {};
for (const n of blkThrough) {
  if (extNames[n]) needExt.add(extNames[n]);
  else if (srcExports[n]) (needSrc[srcExports[n]] ??= []).push(n);
  else if (mainDecl.has(n)) fromMain.push(n);
}
// names main (and the rest) still need from the block
const mainNeeds = [...new Set(mainA.mod.through.map(r => r.identifier.name))].filter(n => declared.includes(n));
const mainWrites = mainA.mod.through.filter(r => declared.includes(r.identifier.name) && r.isWrite()).map(r => r.identifier.name);
const problems = [];
if (fromMain.length) problems.push('block needs names that stay in main: ' + fromMain.join(' '));
const badLets = lets.filter(n => mainNeeds.includes(n)); if (badLets.length) problems.push('let/var used outside the block (live binding): ' + badLets.join(' '));
if (mainWrites.length) problems.push('main assigns block names: ' + [...new Set(mainWrites)].join(' '));
if (blk.ast.body.some(n => JSON.stringify(n).includes('"AwaitExpression"') && n.type !== 'FunctionDeclaration')) problems.push('possible top-level await in block');
const stmts = blk.ast.body.filter(n => !['VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration', 'EmptyStatement'].includes(n.type));
if (stmts.length) problems.push('top-level statements (side effects move earlier): ' + stmts.map(n => block.slice(n.start, n.end).slice(0, 80)).join(' || '));
const calls = blk.ast.body.filter(n => n.type === 'VariableDeclaration').flatMap(n => n.declarations).filter(d => d.init && /Call|New/.test(d.init.type)).map(d => d.id.name || '?');
if (calls.length) console.log('REVIEW initializers that call at load: ' + calls.join(' '));
console.log(`block: ${block.split('\n').length} lines, declares ${declared.length}; main needs ${mainNeeds.length}: ${mainNeeds.join(' ')}`);
console.log(`external: ${[...needExt].join(' | ') || '-'}; from src: ${JSON.stringify(needSrc)}`);
if (problems.length) { console.log('PROBLEMS:\n  ' + problems.join('\n  ')); process.exit(2); }
if (dry) process.exit(0);
// export the top-level declarations (only at column 0)
const exported = [];
const body = block.split('\n').map(l => { const mm = l.match(/^(const|function|class|async function) (\w+)/); if (mm && declared.includes(mm[2])) { exported.push(mm[2]); return 'export ' + l; } return l; }).join('\n');
const notExported = mainNeeds.filter(n => !exported.includes(n)); if (notExported.length) { console.log('PROBLEM: needed names not at a column-0 declaration: ' + notExported.join(' ')); process.exit(2); }
const imports = [...needExt, ...Object.entries(needSrc).map(([f, ns]) => `import { ${ns.sort().join(', ')} } from './${f}.js';`)];
fs.mkdirSync(srcDir, { recursive: true });
fs.writeFileSync(path.join(srcDir, name + '.js'), `// ${header}\n${imports.join('\n')}${imports.length ? '\n\n' : ''}${body}\n`);
// main: insert the import after the last top-level import line
const out = rest_.slice(); let last = -1; const startLine = mainFile.endsWith('.html') ? out.findIndex(l => l.includes('id="main-src"')) : -1;
for (let i = startLine + 1; i < out.length; i++) { if (/^import /.test(out[i])) last = i; else if (out[i].trim() && !out[i].startsWith('//') && last >= 0) break; }
const prefix = mainFile.endsWith('.html') ? './src/' : './';
if (mainNeeds.length) out.splice(last + 1, 0, `import { ${mainNeeds.sort().join(', ')} } from '${prefix}${name}.js';`);
fs.writeFileSync(mainFile, out.join('\n'));
console.log(`wrote src/${name}.js (exports ${exported.length}) and the import in ${path.basename(mainFile)}`);
