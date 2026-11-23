// node ico-run.mjs shape.json L [L...]  : icosphere-topology polyhedron (vertices on the body, triangles from the icosphere), exact check (no hull needed)
import fs from 'fs'; import vm from 'vm'; import {icosphere} from './verify.mjs'; import {quantize,exactCheck,flipToConvex} from './poly-check.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const a=process.argv.slice(2); const sj=JSON.parse(fs.readFileSync(a[0],'utf8')); const S=new G.Shape({c:sj.c,Lmax:sj.Lmax});
for(const L of a.slice(1).map(Number)){ const tm={}; let t=performance.now(); const ico=icosphere(L); const P=ico.V.map(u=>S.point(u[0],u[1],u[2],[0,0,0])); const PI=quantize(P); tm.sample=(performance.now()-t)/1000;
  // orient outward
  t=performance.now(); const fl=flipToConvex(PI,ico.T); const T=fl.T; tm.flip=(performance.now()-t)/1000; const r=exactCheck(PI,T,tm);
  console.log(JSON.stringify({L,flips:fl.flips,V:PI.length,F:T.length,S:r.S,U:r.U,H:r.H,PH:r.poincareHopf,cert:r.convexCert,nonConvex:r.nonConvexEdges,flat:r.flatEdges,tipBad:r.tip.notLower,sinks:r.tip.sinks,timing:Object.fromEntries(Object.entries(tm).map(([k,v])=>[k,+v.toFixed(3)]))})); }
