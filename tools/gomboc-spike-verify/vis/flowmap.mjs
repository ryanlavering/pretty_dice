// Round 17: support function h(u), its gradient magnitude and the tipping-flow basins on an icosphere (float), for a body JSON from polyprep.py / smoothprep.mjs.
//   node vis/flowmap.mjs DATADIR name [level=6]      writes DATADIR/name_h.json (map frame: stable direction at lon 0 lat 0) and prints a summary
// h(u) = height of the CoM when the body rests with outward normal u down.  Polyhedron: max_v v.u.  Smooth: core.js support().  grad h = x* - (x*.u)u with x* the contact point/vertex;
// |grad h| is the CoM-to-contact lever arm (tangential part). Basins: discrete steepest descent on the mesh, minima merged by sublevel persistence (thr), as basin-map.mjs.
import fs from 'fs'; import vm from 'vm'; import {icosphere} from '../verify.mjs'; import {persistence} from '../persistence.mjs'; import {edgesOf,neighbours} from './hmap-lib.mjs';
const [data,name,lv]=process.argv.slice(2); const L=+(lv||6); const B=JSON.parse(fs.readFileSync(`${data}/${name}.json`,'utf8'));
const ico=icosphere(L); const n=ico.V.length; const nrm=v=>{ const l=Math.hypot(...v); return v.map(x=>x/l); };
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
// rotation taking the (lowest) stable direction s to +x: columns of R^T
const stableDirs=B.kind==='poly'?B.stable.map(f=>{ const p=B.faces[f].map(i=>B.verts[i]); const a=p[0],b=p[1],c=p[2]; const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]; return nrm([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]); }):B.stable.map(s=>s.u);
const s0=stableDirs[0]; let ex=[1,0,0]; // build orthonormal frame (s0, e2, e3) and map s0 -> x
const t=Math.abs(s0[2])<0.9?[0,0,1]:[1,0,0]; const e2=nrm([s0[1]*t[2]-s0[2]*t[1],s0[2]*t[0]-s0[0]*t[2],s0[0]*t[1]-s0[1]*t[0]]); const e3=[s0[1]*e2[2]-s0[2]*e2[1],s0[2]*e2[0]-s0[0]*e2[2],s0[0]*e2[1]-s0[1]*e2[0]];
const toBody=u=>[u[0]*s0[0]+u[1]*e2[0]+u[2]*e3[0],u[0]*s0[1]+u[1]*e2[1]+u[2]*e3[1],u[0]*s0[2]+u[1]*e2[2]+u[2]*e3[2]]; // map-frame u -> body-frame
const toMap=b=>[dot(b,s0),dot(b,e2),dot(b,e3)];
const h=new Float64Array(n), g=new Float64Array(n);
if(B.kind==='poly'){ const P=B.verts; for(let i=0;i<n;i++){ const u=toBody(ico.V[i]); let best=-1e9,bj=0; for(let j=0;j<P.length;j++){ const d=dot(P[j],u); if(d>best){ best=d; bj=j; } } h[i]=best; const x=P[bj]; g[i]=Math.hypot(x[0]-best*u[0],x[1]-best*u[1],x[2]-best*u[2]); } }
else { const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc'); let S; if(name.startsWith('sloan')) S=new G.Shape(0.03); else { const sj=JSON.parse(fs.readFileSync('runs/r10/shape_1.18.json','utf8')); S=new G.Shape({c:sj.c,Lmax:sj.Lmax}); } const r={h:0,x:[0,0,0],n:[0,0,0]}; for(let i=0;i<n;i++){ const u=toBody(ico.V[i]); S.support(u,null,r); h[i]=r.h; const d=dot(r.x,u); g[i]=Math.hypot(r.x[0]-d*u[0],r.x[1]-d*u[1],r.x[2]-d*u[2]); } }
// basins
const nbr=neighbours(ico.T,n);
if(B.kind!=='poly'){ // contact-point Newton in core.js is not converged in the flat valley (gradient from x* unreliable there): use a least-squares gradient of h over the mesh neighbours (tangent plane), second-order accurate
  for(let i=0;i<n;i++){ const u=ico.V[i]; const a=Math.abs(u[2])<0.9?[0,0,1]:[1,0,0]; let e1=[u[1]*a[2]-u[2]*a[1],u[2]*a[0]-u[0]*a[2],u[0]*a[1]-u[1]*a[0]]; e1=nrm(e1); const e2=[u[1]*e1[2]-u[2]*e1[1],u[2]*e1[0]-u[0]*e1[2],u[0]*e1[1]-u[1]*e1[0]]; let A=0,Bq=0,C=0,r1=0,r2=0; for(const j of nbr[i]){ const d=ico.V[j].map((x,k)=>x-u[k]); const x=dot(d,e1),y=dot(d,e2),dh=h[j]-h[i]; A+=x*x; Bq+=x*y; C+=y*y; r1+=x*dh; r2+=y*dh; } const det=A*C-Bq*Bq; g[i]=Math.hypot((C*r1-Bq*r2)/det,(A*r2-Bq*r1)/det); } } const down=new Int32Array(n); for(let i=0;i<n;i++){ let b=i; for(const j of nbr[i]) if(h[j]<h[b]) b=j; down[i]=b; }
const dest=new Int32Array(n); for(let i=0;i<n;i++){ let c=i,k=0; while(down[c]!==c&&k++<5000) c=down[c]; dest[i]=c; }
const THR=+(process.env.THR||(B.kind==='poly'?2e-4:1e-3)); const pr=persistence(n,h,edgesOf(ico.T,n)); const into=new Map(); for(const p of pr.pairs) into.set(p.node,{into:p.into,pers:p.pers});
const rootOf=m=>{ let c=m,k=0; while(into.has(c)&&into.get(c).pers<THR&&k++<10000) c=into.get(c).into; return c; };
const mins=[...new Set([...new Set(dest)].map(rootOf))].sort((a,b)=>h[a]-h[b]); const basin=new Int8Array(n); for(let i=0;i<n;i++) basin[i]=mins.indexOf(rootOf(dest[i]));
const frac=mins.map((m,k)=>basin.reduce((s,b)=>s+(b===k?1:0),0)/n);
// polyhedron: tipping graph on faces (float): next(i) = lowest-d adjacent face k that i's foot violates (d_i n_i.n_k > d_k); depth = tips to the sink; sample depth = depth of the face whose normal is nearest
let depth=null, tipEdges=[], maxDepth=0;
if(B.kind==='poly'){ const Fn=B.faces.map((f,i)=>{ const p=f.map(j=>B.verts[j]); const a=p[0],b=p[1],c=p[2]; const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]; const nn=nrm([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]); return {n:nn,d:dot(nn,a)}; });
  const adj=B.faces.map(()=>new Set()); const em=new Map(); B.faces.forEach((f,i)=>f.forEach((v,k)=>{ const w=f[(k+1)%f.length]; const key=Math.min(v,w)+'_'+Math.max(v,w); if(em.has(key)){ const j=em.get(key); adj[i].add(j); adj[j].add(i); } else em.set(key,i); }));
  const next=Fn.map((f,i)=>{ let b=-1; for(const k of adj[i]){ if(f.d*dot(f.n,Fn[k].n)>Fn[k].d&&(b<0||Fn[k].d<Fn[b].d)) b=k; } return b; });
  const fd=Fn.map((_,i)=>{ let x=i,k=0; while(next[x]>=0&&k<500){ x=next[x]; k++; } return k; }); maxDepth=Math.max(...fd);
  const Fm=Fn.map(f=>toMap(f.n)); depth=new Int16Array(n); for(let i=0;i<n;i++){ let b=0,bd=-2; for(let k=0;k<Fm.length;k++){ const d=dot(Fm[k],ico.V[i]); if(d>bd){ bd=d; b=k; } } depth[i]=fd[b]; }
  next.forEach((k,i)=>{ if(k>=0) tipEdges.push([Fm[i].map(x=>+x.toFixed(4)),Fm[k].map(x=>+x.toFixed(4))]); }); }
// critical points (map frame)
const crit={stable:[],unstable:[],saddle:[]};
if(B.kind==='poly'){ B.stable.forEach((f,k)=>crit.stable.push({u:toMap(stableDirs[k]),h:Math.abs(dot(stableDirs[k],B.verts[B.faces[f][0]]))})); B.peaks.forEach(v=>{ const x=B.verts[v]; crit.unstable.push({u:toMap(nrm(x)),h:Math.hypot(...x)}); });
  B.saddles.forEach(([a,b])=>{ const A=B.verts[a],C=B.verts[b]; const d=[C[0]-A[0],C[1]-A[1],C[2]-A[2]]; const tt=-dot(A,d)/dot(d,d); const p=[A[0]+tt*d[0],A[1]+tt*d[1],A[2]+tt*d[2]]; crit.saddle.push({u:toMap(nrm(p)),h:Math.hypot(...p)}); }); }
else { for(const s of B.stable) crit.stable.push({u:toMap(s.u),h:s.h}); for(const s of B.peaks) crit.unstable.push({u:toMap(s.u),h:s.h}); for(const s of B.saddlePts||[]) crit.saddle.push({u:toMap(s.u),h:s.h}); }
// gradient statistics near critical points (angular rings)
const ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
const ring=(c,lo,hi)=>{ const a=[]; for(let i=0;i<n;i++){ const t=ang(ico.V[i],c.u); if(t>=lo&&t<hi) a.push(g[i]); } return a.length?{mean:a.reduce((x,y)=>x+y)/a.length,max:Math.max(...a),min:Math.min(...a),n:a.length}:null; };
const stats={}; for(const kind of ['stable','unstable','saddle']) stats[kind]=crit[kind].slice(0,3).map(c=>({h:c.h,r0_2deg:ring(c,0,0.035),r2_6deg:ring(c,0.035,0.105),r6_12deg:ring(c,0.105,0.21)}));
const gmax=Math.max(...g), hmin=Math.min(...h), hmax=Math.max(...h);
const out={name,label:B.label,info:B.info,L,V:ico.V.map(v=>v.map(x=>+x.toFixed(5))),T:ico.T,h:Array.from(h,x=>+x.toFixed(6)),g:Array.from(g,x=>+x.toFixed(6)),basin:Array.from(basin),depth:depth?Array.from(depth):null,maxDepth,tipEdges,nBasins:mins.length,frac,crit,stats,gmax,hmin,hmax,minsH:mins.map(m=>h[m])};
fs.writeFileSync(`${data}/${name}_h.json`,JSON.stringify(out)); console.log(JSON.stringify({name,L,thr:THR,hmin,hmax,gmax,basins:mins.length,frac:frac.map(f=>+f.toFixed(4)),minsH:mins.map(m=>+h[m].toFixed(5)),crit:{S:crit.stable.length,U:crit.unstable.length,H:crit.saddle.length},stats},null,0));
