// 4.1 factoring tool (docs/design/v41-factoring-plan.md). Needs acorn + eslint-scope outside the repo (not app or test deps):
//   npm i --no-save --prefix /tmp/pdfactor acorn eslint-scope      (or set PD_FACTOR_LIBS to another prefix)
import { createRequire } from 'node:module';
const __req = createRequire((process.env.PD_FACTOR_LIBS || '/tmp/pdfactor') + '/node_modules/');
const acorn = __req('acorn'), eslintScope = __req('eslint-scope');
// remove names from main's './src/' import lines that main no longer references
import fs from 'node:fs'; import path from 'node:path'; const repo = process.argv[2], file = fs.existsSync(path.join(repo, 'src/main.js')) ? path.join(repo, 'src/main.js') : path.join(repo, 'index.html');
let t = fs.readFileSync(file, 'utf8'); let off = 0, src = t;
if (file.endsWith('.html')) { const s = t.indexOf('<script type="text/plain" id="main-src">'), b = t.indexOf('\n', s) + 1, e = t.indexOf('</script>', b); off = b; src = t.slice(b, e); }
const ast = acorn.parse(src, { ecmaVersion: 2024, sourceType: 'module', ranges: true });
const mod = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' }).globalScope.childScopes.find(s => s.type === 'module');
const unused = new Set(mod.variables.filter(v => v.defs[0]?.type === 'ImportBinding' && v.references.length === 0 && /^\.\/src\//.test(v.defs[0].parent.source.value)).map(v => v.name));
if (!unused.size) { console.log('nothing to prune'); process.exit(0); }
const out = src.replace(/^import \{([^}]*)\} from '(\.\/src\/[\w-]+\.js)';[ \t]*\n/gm, (m, names, from) => { const keep = names.split(',').map(n => n.trim()).filter(n => n && !unused.has(n)); return keep.length ? `import { ${keep.join(', ')} } from '${from}';\n` : ''; });
fs.writeFileSync(file, t.slice(0, off) + out + t.slice(off + src.length)); console.log('pruned', [...unused].join(' '));
