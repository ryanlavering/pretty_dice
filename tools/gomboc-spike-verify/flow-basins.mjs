// Face-flow basin maps (round 9): follow every sample direction down the CoM-height landscape h(u) (steepest descent, rolling to rest) and up (to the unstable points),
// cluster the destinations, colour the basins, report basin area fractions, optionally with the CoM shifted by eps toward the intended stable point.
//   node flow-basins.mjs shape.json "0,0.5,1,2,3" out_prefix [--level 3] [--paths 6]       (writes out_prefix.json and out_prefix.svg; eps in percent of the mean radius)
// The intended stable point = the lowest minimum found at eps = 0. Equilibria with the CoM shifted: shape.setNudge(s* * eps). Basin fraction = share of the sample directions (icosphere vertices, near equal area).
import fs from 'fs'; import vm from 'vm'; import {icosphere} from './verify.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const a=process.argv.slice(2); const get=(k,d)=>{ const i=a.indexOf(k); return i>=0?+a[i+1]:d; };
const VEC=a.includes('--vec')?JSON.parse(fs.readFileSync(a[a.indexOf('--vec')+1],'utf8')).bestShift:null;   // optional: shift vector P* (body frame); eps then means percent of P* (100 = the full shift)
const sj=JSON.parse(fs.readFileSync(a[0],'utf8')); const eps=a[1].split(',').map(Number); const prefix=a[2]; const LVL=get('--level',3), PS=get('--paths',6);
const S=new G.Shape({c:sj.c,Lmax:sj.Lmax}); const ico=icosphere(LVL); const r={h:0,x:[0,0,0],n:[0,0,0]};
const norm=v=>{ const l=Math.hypot(v[0],v[1],v[2]); return [v[0]/l,v[1]/l,v[2]/l]; };
function hAndGrad(u){ S.support(u,null,r); const d=r.x[0]*u[0]+r.x[1]*u[1]+r.x[2]*u[2]; return {h:r.h,g:[r.x[0]-d*u[0],r.x[1]-d*u[1],r.x[2]-d*u[2]]}; }
function flow(u0,sign,keep){ let u=u0.slice(), st=hAndGrad(u), eta=0.4, path=keep?[u.slice()]:null; for(let it=0;it<700;it++){ const gn=Math.hypot(...st.g); if(gn<3e-6) break; let ok=false; for(let k=0;k<8;k++){ const v=norm([u[0]-sign*eta*st.g[0],u[1]-sign*eta*st.g[1],u[2]-sign*eta*st.g[2]]); const s2=hAndGrad(v); if(sign*(s2.h-st.h)<=0){ u=v; st=s2; eta=Math.min(eta*1.4,3); ok=true; break; } eta*=0.5; } if(!ok) break; if(keep&&it%4===0) path.push(u.slice()); } if(keep) path.push(u.slice()); return {u,h:st.h,gn:Math.hypot(...st.g),path}; }
function cluster(items,tol=0.12){ const cl=[]; for(const it of items){ let f=cl.find(c=>Math.acos(Math.min(1,c.u[0]*it.u[0]+c.u[1]*it.u[1]+c.u[2]*it.u[2]))<tol); if(f){ f.n++; it.cl=f; } else { const c={u:it.u,h:it.h,n:1}; cl.push(c); it.cl=c; } } return cl; }
let sStar=null; const out={shape:a[0],level:LVL,runs:[]};
const sph=u=>[Math.atan2(u[1],u[0]),Math.acos(Math.max(-1,Math.min(1,u[2])))];
for(const e of eps){ const t0=Date.now(); S.setNudge(VEC?VEC.map(x=>x*e/100):(sStar?sStar.map(x=>x*e/100):[0,0,0])); const dn=ico.V.map((u,i)=>({i,u0:u,...flow(u,1,i%Math.max(1,Math.round(ico.V.length/(PS*40)))===0)})); const up=ico.V.map(u=>flow(u,-1,false));
  const mins=cluster(dn.map(d=>({u:d.u,h:d.h}))).sort((p,q)=>p.h-q.h); dn.forEach((d,i)=>{ d.cl=mins.findIndex(m=>Math.acos(Math.min(1,m.u[0]*d.u[0]+m.u[1]*d.u[1]+m.u[2]*d.u[2]))<0.12); });
  const maxs=cluster(up.map(d=>({u:d.u,h:d.h}))).sort((p,q)=>q.h-p.h); if(!sStar){ sStar=mins[0].u.slice(); }
  const total=ico.V.length; const frac=mins.map((m,k)=>dn.filter(d=>d.cl===k).length/total);
  const rec={epsPercent:e,minima:mins.map((m,k)=>({u:m.u.map(x=>+x.toFixed(5)),h:+m.h.toFixed(6),fraction:+frac[k].toFixed(4)})),maxima:maxs.map(m=>({u:m.u.map(x=>+x.toFixed(5)),h:+m.h.toFixed(6),count:m.n})),unconverged:dn.filter(d=>d.cl<0).length,seconds:(Date.now()-t0)/1000};
  rec.dn=dn.map(d=>({u:d.u0,cl:d.cl,path:d.path})); out.runs.push(rec); console.error(`eps ${e}%: ${mins.length} minima (h ${mins.map(m=>m.h.toFixed(4)).join(', ')}), basin fractions ${frac.map(f=>(100*f).toFixed(1)+'%').join(', ')}, maxima ${maxs.length}, unconverged ${rec.unconverged}, ${rec.seconds.toFixed(0)}s`); }
out.stable=sStar; const pal=['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b'];
// SVG small multiples
const W=330,H=190,cols=Math.min(3,eps.length),rows=Math.ceil(eps.length/cols); let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*(W+10)+10}" height="${rows*(H+34)+10}" font-family="sans-serif" font-size="11"><rect width="100%" height="100%" fill="#fff"/>`;
out.runs.forEach((run,k)=>{ const ox=10+(k%cols)*(W+10), oy=10+Math.floor(k/cols)*(H+34); svg+=`<text x="${ox}" y="${oy+12}">CoM shift ${VEC?run.epsPercent+'% of the found shift P*':run.epsPercent+'% toward the first stable point'}; basins: ${run.minima.map((m,i)=>(100*m.fraction).toFixed(0)+'%').join(' / ')}</text>`; const X=th=>ox+(th+Math.PI)/(2*Math.PI)*W, Y=ph=>oy+18+ph/Math.PI*H;
  run.dn.forEach(d=>{ const [th,ph]=sph(d.u); svg+=`<circle cx="${X(th).toFixed(1)}" cy="${Y(ph).toFixed(1)}" r="2.6" fill="${d.cl>=0?pal[d.cl%pal.length]:'#999'}" fill-opacity="0.55"/>`; });
  run.dn.filter(d=>d.path).forEach(d=>{ let pts=[]; const flush=()=>{ if(pts.length>1) svg+=`<polyline fill="none" stroke="#222" stroke-opacity="0.35" stroke-width="0.7" points="${pts.join(' ')}"/>`; pts=[]; }; let prev=null; for(const u of d.path){ const [th,ph]=sph(u); if(prev!==null&&Math.abs(th-prev)>Math.PI) flush(); pts.push(X(th).toFixed(1)+','+Y(ph).toFixed(1)); prev=th; } flush(); });
  run.minima.forEach((m,i)=>{ const [th,ph]=sph(m.u); svg+=`<circle cx="${X(th).toFixed(1)}" cy="${Y(ph).toFixed(1)}" r="5" fill="none" stroke="#000" stroke-width="2"/><text x="${X(th)+6}" y="${Y(ph)-5}">S${i+1}</text>`; }); run.maxima.forEach(m=>{ const [th,ph]=sph(m.u); svg+=`<path d="M${X(th)-5},${Y(ph)-5}l10,10m0,-10l-10,10" stroke="#000" stroke-width="2"/>`; }); });
svg+='</svg>'; fs.writeFileSync(prefix+'.svg',svg); fs.writeFileSync(prefix+'.json',JSON.stringify({...out,runs:out.runs.map(r=>({...r,dn:undefined}))})); console.error('wrote',prefix+'.svg');
