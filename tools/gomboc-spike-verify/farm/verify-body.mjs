// node verify-body.mjs run.json workdir  -> one JSON line {ok, failed, ...measures}. Stages (early exit): L5 winding, convexity, support persistence L6, L6 winding, tolerance region M at L6, L7 winding.
// Accept only +2/-0 at L5/L6/L7 (K samples 6/4/3 per edge), K min > 0.01, persistence <= 3e-4 (artefact floor), M nonempty with the origin in M. Rigor label: numerically verified (L5/L6/L7).
import fs from 'fs'; import {execFileSync} from 'child_process'; import path from 'path'; import {TOOLS,readJSON} from './lib.mjs';
const [runF,W]=process.argv.slice(2); fs.mkdirSync(W,{recursive:true}); const run=readJSON(runF); const res={ok:false,failed:null,winding:{}}; const sh=W+'/shape.json';
const run_=(cmd,args,env={})=>execFileSync(cmd,args,{cwd:TOOLS,encoding:'utf8',env:{...process.env,...env},maxBuffer:1e8,stdio:['ignore','pipe','pipe']});
const out=()=>{ console.log(JSON.stringify(res)); process.exit(0); };
const fail=(s)=>{ res.failed=s; out(); };
run_('node',['ring-family.mjs',Object.entries(run.params).map(([k,v])=>k+'='+v).join(','),sh]);
const wind=(L,K)=>{ const o=run_('node',['index.mjs','0',''+L,''+K],{SHAPEFILE:sh}).split('\n')[0]; const m=/index>0: (\d+), index<0: (\d+)/.exec(o); return m?[+m[1],+m[2]]:[99,99]; };
const good=w=>w[0]===2&&w[1]===0;
let t=Date.now(); res.winding.L5=wind(5,6); res.sec5=(Date.now()-t)/1000; if(!good(res.winding.L5)) fail('L5');
{ const o=run_('node',['convex.mjs','0'],{SHAPEFILE:sh}); const m=/"Kmin":([-\d.e]+)/.exec(o); res.Kmin=m?+m[1]:-1; if(!(res.Kmin>0.01)) fail('convexity'); }
{ const o=run_('node',['persistence.mjs','smooth',sh,'0','--level','6'],{}); const j=JSON.parse(o.trim().split('\n').pop()); res.persistenceL6=j.topPersistences[0]; res.persTop=j.topPersistences; if(!(res.persistenceL6<=3e-4)) fail('persistence'); }
res.winding.L6=wind(6,4); if(!good(res.winding.L6)) fail('L6');
{ const o=run_('node',['cm-tolerance.mjs','smooth',sh,'--radius','0.03','--step','0.005','--level','6','--k','3']); const m=/at CoM: \+(\d+) \/ -(\d+).*?(\d+) grid points in M.*?summary (\{.*\});/.exec(o); if(!m) fail('M_parse'); res.MatCoM=[+m[1],+m[2]]; res.Msize=+m[3]; const sm=JSON.parse(m[4]); res.Mextent=sm.extentPercentOfRadius; res.Dorigin=sm.D; if(!(res.Msize>0)||!(sm.D===0)) fail('M'); }
t=Date.now(); res.winding.L7=wind(7,3); res.sec7=(Date.now()-t)/1000; if(!good(res.winding.L7)) fail('L7');
res.ok=true; res.rigor='numerically verified (L5/L6/L7)'; out();
