// node poly-run.mjs shape.json N [N...]   -> one JSON line per N with timings and exact-check results (also --save out.json for the quantised polyhedron)
import fs from 'fs'; import vm from 'vm'; import {fib} from './hull.mjs'; import {quantize,buildHull,exactCheck,floatCheck,globalConvexCert} from './poly-check.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const a=process.argv.slice(2); const sj=JSON.parse(fs.readFileSync(a[0],'utf8')); const S=new G.Shape({c:sj.c,Lmax:sj.Lmax});
export function points(S,N){ return fib(N).map(u=>S.point(u[0],u[1],u[2],[0,0,0])); }
const save=a.indexOf('--save'); const glob=a.includes('--global'); const Ns=a.slice(1).filter(x=>/^\d+$/.test(x)).map(Number);
for(const N of Ns){ const tm={}; let t=performance.now(); const P=points(S,N); tm.sample=(performance.now()-t)/1000; const PI=quantize(P); t=performance.now(); const T=buildHull(PI); tm.hull=(performance.now()-t)/1000;
  const r=exactCheck(PI,T,tm); t=performance.now(); const fl=floatCheck(PI.map(p=>p.map(x=>Number(x)/2**40)),T); tm.floatAll=(performance.now()-t)/1000;
  if(glob){ t=performance.now(); r.global=globalConvexCert(PI,T); tm.globalCert=(performance.now()-t)/1000; }
  const o={shape:a[0].split('/').pop(),N,vertices:PI.length,faces:T.length,hullVertexLoss:N-PI.length,timing:Object.fromEntries(Object.entries(tm).map(([k,v])=>[k,+v.toFixed(3)])),S:r.S,U:r.U,H:r.H,PH:r.poincareHopf,convexCert:r.convexCert,nonConvexEdges:r.nonConvexEdges,flat:r.flatEdges,centroidOutside:r.centroidOutsidePlanes,tip:r.tip,degenerate:r.degenerate,pass:r.pass1,floatS:fl.S,floatMinFootMargin:fl.minFootMargin,exactCentroid:r.centroid,stableHeights:r.heights,global:r.global};
  console.log(JSON.stringify(o)); if(save>0){ fs.writeFileSync(a[save+1].replace('.json',`_${N}.json`),JSON.stringify({vertices:PI.map(p=>p.map(x=>x.toString())),faces:T,scale:'2^40'})); } }
