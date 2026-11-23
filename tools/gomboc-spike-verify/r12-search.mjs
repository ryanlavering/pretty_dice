// Round 12: direct search for a convex polyhedron with exactly one stable face (float cost; exact confirm is r12-certify.mjs).
//   node r12-search.mjs param(vert|hs) opt(anneal|greedy) seedKind(sph|body|twist|r10) F seconds rngSeed [outPrefix]
// param vert: state = N points, polyhedron = hull (about 2N-4 triangular faces).  param hs: state = planes (unit normal, offset from a fixed origin), polyhedron = intersection (dual hull),
//   N=(F+4)/2 planes initially (the face count can drop when a plane becomes redundant).
// Cost (FLOAT): sum over stable faces other than the lowest stable one of (1 + 0.5*min(m/0.05,1)) (m = signed distance of the CoM foot inside the face polygon: the smooth part),
//   plus 2*max(0, rmax/hmin - 3) (aspect limit). S=1 -> cost 0. Stable test is conservative (m > -1e-9).
// Moves: anneal = random vertex/plane (30% from bad-stable faces and their neighbours); greedy = tipping-graph guided: 90% of proposals are on a bad stable face (the stable face whose
//   foot margin is smallest first), accept if cost not worse, no temperature.
import fs from 'fs'; import {hull,fib} from './hull.mjs'; import {evalHS,planesOfHull} from './r12-eval.mjs'; import {bodyPoints} from './r12-merge.mjs'; import {polyEquilibria} from './poly-equilibria.mjs';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const [param,opt,seedKind,Ftarget,secs,rs,outP]=[process.argv[2],process.argv[3],process.argv[4],+process.argv[5],+process.argv[6],+process.argv[7],process.argv[8]];
let s=rs>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const ASP=+(process.env.ASP||3), FLOOR=+(process.env.FLOOR||0); // ASP: max rmax/hmin; FLOOR: penalise F below FLOOR*Ftarget
const N0=Math.round((Ftarget+4)/2);
function seedPoints(){ let P; if(seedKind==='sph') P=fib(N0).map(u=>u.map(x=>x*(1+0.05*gauss()))); else if(seedKind==='body') P=bodyPoints('runs/r10/shape_1.16.json',N0); else if(seedKind==='twist') P=fib(N0).map(u=>{ const a=1.6*u[2]; const x=1.5*u[0],y=1.0*u[1],z=0.8*u[2]; return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z]; });
  else if(seedKind==='r10'){ const f=Ftarget<=50?'runs/r10/lp3_40.json':'runs/r10/lp3_80.json'; P=JSON.parse(fs.readFileSync(f,'utf8')); const t=hull(P); let V6=0,C=[0,0,0]; for(const q of t){ const [A,B,Cc]=q.v.map(i=>P[i]); const v=dot(A,cr(B,Cc)); V6+=v; for(let k=0;k<3;k++) C[k]+=v*(A[k]+B[k]+Cc[k]); } const c=C.map(x=>x/(4*V6)); P=P.map(p=>sub(p,c)); const r=Math.cbrt(Math.abs(V6)/6/(4/3*Math.PI)); P=P.map(p=>p.map(x=>x/r)); }
  else throw new Error('seed'); const t=hull(P); let V6=0,C=[0,0,0]; for(const q of t){ const [A,B,Cc]=q.v.map(i=>P[i]); const v=dot(A,cr(B,Cc)); V6+=v; for(let k=0;k<3;k++) C[k]+=v*(A[k]+B[k]+Cc[k]); } const c=C.map(x=>x/(4*V6)); return P.map(p=>sub(p,c)); }
function evalVert(P){ let tri; try{ tri=hull(P); }catch(e){ return {ok:false}; } if(tri.length<4) return {ok:false}; let V6=0,C=[0,0,0]; for(const t of tri){ const [A,B,Cc]=t.v.map(i=>P[i]); const v=dot(A,cr(B,Cc)); V6+=v; for(let k=0;k<3;k++) C[k]+=v*(A[k]+B[k]+Cc[k]); } if(!(V6>0)) return {ok:false}; const c=C.map(x=>x/(4*V6));
  const stable=[],margin=[],h=[],verts=[]; let hmin=1e9,rmax=0; tri.forEach((t,fi)=>{ const hi=t.d-dot(t.n,c); h.push(hi); if(hi<hmin) hmin=hi; const foot=[c[0]+hi*t.n[0],c[1]+hi*t.n[1],c[2]+hi*t.n[2]]; let m=1e9; for(let k=0;k<3;k++){ const a=P[t.v[k]],b=P[t.v[(k+1)%3]]; const e=sub(b,a); const l=Math.hypot(...e); const sd=dot(cr(e,sub(foot,a)),t.n)/(l+1e-300); if(sd<m) m=sd; } margin.push(m); if(m>-1e-9) stable.push(fi); t.v.forEach(i=>verts.push(i)); });
  for(const i of new Set(verts)){ const r=Math.hypot(...sub(P[i],c)); if(r>rmax) rmax=r; } return {ok:hmin>1e-9,F:tri.length,S:stable.length,stable,margin,h,faceIdx:tri.map((_,i)=>i),hmin,rmax,tri,c}; }
let state; // vert: array of points ; hs: {N:[],D:[]}
if(param==='vert') state=seedPoints(); else { const P=seedPoints(); const t=hull(P); state={N:t.map(q=>q.n.slice()),D:t.map(q=>q.d)}; }
const evalState=st=>param==='vert'?evalVert(st):evalHS(st.N,st.D);
const costOf=e=>{ if(!e.ok) return {c:1e9}; let tgt=-1,hb=1e9; e.stable.forEach(i=>{ const k=e.faceIdx.indexOf(i); if(e.h[k]<hb){ hb=e.h[k]; tgt=i; } }); let c=0; for(const i of e.stable){ if(i===tgt) continue; const k=param==='vert'?i:e.faceIdx.indexOf(i); c+=1+0.5*Math.min(e.margin[k]/0.05,1); } const asp=e.rmax/e.hmin; c+=2*Math.max(0,asp-ASP)+(FLOOR>0?3*Math.max(0,FLOOR*Ftarget-e.F)/Ftarget:0); return {c,S:e.S,F:e.F,asp}; };
const clone=st=>param==='vert'?st.map(p=>p.slice()):{N:st.N.map(u=>u.slice()),D:st.D.slice()};
const badSet=(e)=>{ // indices (state indices) of bad stable faces (all but the lowest), ordered by smallest margin first
  let tgt=-1,hb=1e9; const lst=[]; e.stable.forEach(i=>{ const k=param==='vert'?i:e.faceIdx.indexOf(i); lst.push([i,e.margin[k],e.h[k]]); if(e.h[k]<hb){ hb=e.h[k]; tgt=i; } }); return lst.filter(x=>x[0]!==tgt).sort((a,b)=>a[1]-b[1]).map(x=>x[0]); };
function propose(st,e,fr,guided){ const ns=clone(st); const sc=0.25*(1-0.85*fr)+0.01; let idx;
  const bad=guided?badSet(e):[]; let useBad=bad.length&&rnd()<guided;
  if(param==='vert'){ let i; if(useBad){ const f=bad[Math.floor(Math.pow(rnd(),2)*bad.length)]; i=e.tri[f].v[Math.floor(rnd()*3)]; } else i=Math.floor(rnd()*ns.length); const p=ns[i]; if(rnd()<0.3){ const r=Math.hypot(...p); const k=1+0.15*sc*gauss(); ns[i]=p.map(x=>x*k); } else ns[i]=[p[0]+sc*0.3*gauss(),p[1]+sc*0.3*gauss(),p[2]+sc*0.3*gauss()]; }
  else { let i; if(useBad){ i=bad[Math.floor(Math.pow(rnd(),2)*bad.length)]; if(rnd()<0.5){ /* a neighbour: random plane near it */ let best=-1,bd=-2; for(let t=0;t<6;t++){ const j=Math.floor(rnd()*ns.N.length); const d=dot(ns.N[i],ns.N[j]); if(j!==i&&d>bd){ bd=d; best=j; } } i=best; } } else i=Math.floor(rnd()*ns.N.length);
    if(rnd()<0.5){ ns.D[i]=Math.max(0.05,ns.D[i]*(1+0.12*sc*gauss())); } else { const u=ns.N[i]; const w=[u[0]+sc*0.3*gauss(),u[1]+sc*0.3*gauss(),u[2]+sc*0.3*gauss()]; const l=Math.hypot(...w); ns.N[i]=w.map(x=>x/l); } }
  return ns; }
const t0=Date.now(); let cur=evalState(state), cc=costOf(cur); if(!cur.ok){ console.error('bad seed'); process.exit(1); }
let best={...cc,state:clone(state)}; const hist=[]; let it=0, acc=0; const first={S:cur.S,F:cur.F};
const T0=0.6,T1=0.02;
while(Date.now()-t0<secs*1000){ it++; const fr=(Date.now()-t0)/(secs*1000); const guided=opt==='greedy'?0.9:0.3; const ns=propose(state,cur,fr,guided); const e=evalState(ns); const c=costOf(e);
  if(c.c>=1e9) continue; let ok; if(opt==='greedy') ok=c.c<=cc.c; else { const T=T0*Math.pow(T1/T0,fr); ok=c.c<=cc.c||rnd()<Math.exp((cc.c-c.c)/T); }
  if(ok){ state=ns; cur=e; cc=c; acc++; if(c.c<best.c){ best={...c,state:clone(ns)}; } } if(it%2000===0) hist.push([Math.round((Date.now()-t0)/1000),best.S,+best.c.toFixed(2)]); }
const be=evalState(best.state); const o={ASP,FLOOR,param,opt,seedKind,Ftarget,rngSeed:rs,secs,iters:it,evalsPerSec:+(it/secs).toFixed(1),startS:first.S,startF:first.F,bestS:be.S,bestF:be.F,cost:+best.c.toFixed(3),aspect:+(be.rmax/be.hmin).toFixed(2),hist:hist.slice(-6)};
if(be.S<=3){ try{ const V=param==='vert'?best.state:be.verts; const eq=polyEquilibria(V); o.check={S:eq.S,U:eq.U,H:eq.H,PH:eq.poincareHopf,F:eq.F}; }catch(e){ o.check='fail'; } }
console.log(JSON.stringify(o)); if(outP){ const V=param==='vert'?best.state:be.verts.map(v=>v.map((x,k)=>x+be.c[k])); fs.writeFileSync(outP+`_${param}_${opt}_${seedKind}_${Ftarget}_${rs}_S${be.S}.json`,JSON.stringify(V)); }
