// Round 17 visual lane: smooth body -> render JSON (icosphere mesh about the CoM, discrete Morse critical points of h(u)).
// run from tools/gomboc-spike-verify:  node vis/smoothprep.mjs OUTDIR
import fs from 'fs'; import vm from 'vm'; import {icosphere} from '../verify.mjs'; import {criticalPersistent} from './hmap-lib.mjs';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
const out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
const L=+(process.env.LVL||6);
function prep(name,label,S){ const ico=icosphere(L); const n=ico.V.length; const r={h:0,x:[0,0,0],n:[0,0,0]}; const h=new Float64Array(n), X=[]; const verts=[]; const p=[0,0,0];
  for(let i=0;i<n;i++){ const u=ico.V[i]; S.point(u[0],u[1],u[2],p); verts.push(p.slice()); S.support(u,null,r); h[i]=r.h; X.push(r.x.slice()); }
  const rr=verts.map(v=>Math.hypot(...v)); const cp=criticalPersistent(ico,h,+(process.env.THR||1e-3)); const m={list:{min:cp.min,max:cp.max,saddle:cp.saddle},cnt:{min:cp.min.length,max:cp.max.length,saddle:cp.saddle.length,multi:cp.raw.multi}};
  const mk=idx=>idx.map(i=>({u:ico.V[i],h:h[i],x:X[i]}));
  const rbar=rr.reduce((a,b)=>a+b)/n;
  const body={name,label,kind:'smooth',verts,faces:ico.T,centroid:[0,0,0],cm:'homogeneous (CoM = centroid)',stable:mk(m.list.min),peaks:mk(m.list.max),saddlePts:mk(m.list.saddle),
    info:{S:m.cnt.min,U:m.cnt.max,H:m.cnt.saddle,multi:m.cnt.multi,ratio:Math.max(...h)/Math.min(...h),rmaxOverRmin:Math.max(...rr)/Math.min(...rr),hmin:Math.min(...h),hmax:Math.max(...h),icoLevel:L,rawDiscrete:{S:0}}};
  fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(body)); console.log(name,JSON.stringify(body.info)); }
prep('sloan003','Sloan beta 0.03 (smooth)',new G.Shape(0.03));
const sj=JSON.parse(fs.readFileSync('runs/r10/shape_1.18.json','utf8')); prep('smooth118','Verified smooth body, r_max/r_min 1.18',new G.Shape({c:sj.c,Lmax:sj.Lmax}));
