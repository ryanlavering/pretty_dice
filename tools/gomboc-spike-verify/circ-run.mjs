// Circumscribed polyhedron (faces tangent to the smooth body at Fibonacci normals u_i, offset h(u_i) from the body's own CoM): float experiment.
// Face i is a stable rest iff its foot h_i u_i lies in the face cell: for every hull-neighbour j (neighbours of p_i=u_i/h_i in the polar hull): h_i (u_i.u_j) <= h_j.
//   node circ-run.mjs shape.json N [N...]
import fs from 'fs'; import vm from 'vm'; import {fib,hull} from './hull.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const a=process.argv.slice(2); const sj=JSON.parse(fs.readFileSync(a[0],'utf8')); const S=new G.Shape({c:sj.c,Lmax:sj.Lmax}); const r={h:0,x:[0,0,0],n:[0,0,0]};
for(const N of a.slice(1).map(Number)){ const tm={}; let t=performance.now(); const U=fib(N); const h=U.map(u=>{ S.support(u,null,r); return r.h; }); tm.support=(performance.now()-t)/1000;
  t=performance.now(); const p=U.map((u,i)=>u.map(x=>x/h[i])); const T=hull(p); tm.hull=(performance.now()-t)/1000; t=performance.now();
  const nb=Array.from({length:N},()=>new Set()); for(const f of T){ for(let k=0;k<3;k++){ nb[f.v[k]].add(f.v[(k+1)%3]); nb[f.v[k]].add(f.v[(k+2)%3]); } }
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; let Sc=0, margin=1e9; const st=[]; for(let i=0;i<N;i++){ let ok=true; for(const j of nb[i]){ const m=h[j]-h[i]*dot(U[i],U[j]); if(m<0) ok=false; } if(ok){ Sc++; st.push(i); } } tm.classify=(performance.now()-t)/1000;
  console.log(JSON.stringify({N,faces:N,verticesOfPoly:T.length,S:Sc,timing:Object.fromEntries(Object.entries(tm).map(([k,v])=>[k,+v.toFixed(3)]))})); }
// cluster the stable faces: connected components under a 4*mean-spacing angular distance
if(process.env.CLUSTER){ const N=+a[a.length-1]; const U=fib(N); const h=U.map(u=>{ S.support(u,null,r); return r.h; }); const p=U.map((u,i)=>u.map(x=>x/h[i])); const T=hull(p); const nb=Array.from({length:N},()=>new Set()); for(const f of T){ for(let k=0;k<3;k++){ nb[f.v[k]].add(f.v[(k+1)%3]); nb[f.v[k]].add(f.v[(k+2)%3]); } }
  const dot=(x,y)=>x[0]*y[0]+x[1]*y[1]+x[2]*y[2]; const st=[]; for(let i=0;i<N;i++){ let ok=true; for(const j of nb[i]) if(h[j]-h[i]*dot(U[i],U[j])<0) ok=false; if(ok) st.push(i); }
  const thr=Math.cos(4*Math.sqrt(4*Math.PI/N)); const comp=new Map(); const seen=new Set(); const comps=[]; for(const s of st){ if(seen.has(s)) continue; const q=[s]; seen.add(s); const c=[]; while(q.length){ const x=q.pop(); c.push(x); for(const y of st) if(!seen.has(y)&&dot(U[x],U[y])>thr){ seen.add(y); q.push(y); } } comps.push(c); }
  comps.sort((x,y)=>y.length-x.length); console.log('stable faces',st.length,'clusters',comps.length); for(const c of comps.slice(0,12)){ const m=c.reduce((s,i)=>[s[0]+U[i][0],s[1]+U[i][1],s[2]+U[i][2]],[0,0,0]); const l=Math.hypot(...m); const mu=m.map(x=>x/l); const rad=Math.max(...c.map(i=>Math.acos(Math.min(1,dot(U[i],mu))))); const hm=Math.min(...c.map(i=>h[i])); console.log('size',c.length,'centre',mu.map(x=>x.toFixed(3)).join(','),'angular radius deg',(rad*57.3).toFixed(1),'min h',hm.toFixed(5)); } }
