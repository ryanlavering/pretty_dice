// Round 13 B: prism arrangement in CoM space. Face i is stable for CoM c iff the foot of c on plane i lies inside polygon i (prism P_i). Find c inside the body with exactly ONE prism over it, nearest the homogeneous centroid.
//   node r13-prism.mjs exact.json [nSamples] [out.json]   (float search, then EXACT BigInt confirmation of S(c)=1 for the dyadic CoM c; convexity certificate of the polyhedron itself from exactCheck)
import fs from 'fs'; import {exactCheck,globalConvexCert} from './poly-check.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const NS=+(process.argv[3]||300000); const SC=2**40; const PI=J.vertices.map(p=>p.map(BigInt)), T=J.faces;
const r0=exactCheck(PI,T); const cc=r0.centroid; const P=PI.map(p=>p.map((x,i)=>Number(x)/SC-cc[i])); const rm=P.reduce((a,p)=>a+Math.hypot(...p),0)/P.length;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const Fc=T.map(([a,b,c])=>{ const n=cr(sub(P[b],P[a]),sub(P[c],P[a])); const l=Math.hypot(...n); const u=n.map(x=>x/l); return {u,d:dot(u,P[a]),v:[P[a],P[b],P[c]]}; });
function margins(c){ const out=new Float64Array(Fc.length); for(let i=0;i<Fc.length;i++){ const f=Fc[i]; const h=f.d-dot(f.u,c); const foot=[c[0]+h*f.u[0],c[1]+h*f.u[1],c[2]+h*f.u[2]]; let m=1e9; for(let k=0;k<3;k++){ const a=f.v[k],b=f.v[(k+1)%3]; const e=sub(b,a); const s=dot(cr(e,sub(foot,a)),f.u)/Math.hypot(...e); if(s<m) m=s; } out[i]=m; } return out; }
const inside=c=>{ for(const f of Fc) if(dot(f.u,c)>=f.d-1e-9) return false; return true; };
const mn=[1,2,3].map(k=>Math.min(...P.map(p=>p[k-1]))), mx=[1,2,3].map(k=>Math.max(...P.map(p=>p[k-1])));
let s=12345; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
const cnt=c=>{ const m=margins(c); let n=0,w=-1,best=-1e9,second=-1e9; for(let i=0;i<m.length;i++){ if(m[i]>0){ n++; w=i; } } return {n,w,m}; };
const homo=cnt([0,0,0]); let best=null; for(let it=0;it<NS;it++){ const c=[0,1,2].map(k=>mn[k]+(mx[k]-mn[k])*rnd()); if(!inside(c)) continue; const q=cnt(c); if(q.n!==1) continue; const d=Math.hypot(...c); if(!best||d<best.d){ best={c,d,w:q.w}; } }
let res={file:process.argv[2],faces:T.length,verts:PI.length,homogeneousS:r0.S,radius:rm,samples:NS};
if(best){ // local search
  const TOL=+(process.env.TOL||0.002)*rm; const okc=c=>{ if(!inside(c)) return false; const q=cnt(c); if(q.n!==1) return false; for(let i=0;i<q.m.length;i++) if(i!==q.w&&q.m[i]>-TOL) return false; return true; };
  let c=best.c, okAny=okc(c); let step=0.2*rm; for(let it=0;it<80000&&step>1e-7*rm;it++){ const t=[rnd()-.5,rnd()-.5,rnd()-.5].map(x=>x*2*step); const c2=c.map((x,i)=>x+t[i]); if(Math.hypot(...c2)<Math.hypot(...c)&&(okc(c2)||(!okAny&&cnt(c2).n===1&&inside(c2)))){ c=c2; if(okc(c)) okAny=true; } else if(it%200===199) step*=0.8; }
  best={c,d:Math.hypot(...c),w:cnt(c).w};
  const q=cnt(best.c); const wm=q.m[q.w]; let other=-1e9; for(let i=0;i<q.m.length;i++) if(i!==q.w&&q.m[i]>other) other=q.m[i];
  // dyadic CoM (2^-30 of the unit) and exact confirmation: foot inside iff det[b-a, c-a, n]>0 for every edge (exact), count faces with all three edges positive
  const GR=2n**30n, ONE=BigInt(SC); const cD=best.c.map((x,i)=>BigInt(Math.round((x+cc[i])*Number(GR)))); // CoM in units 2^-30 absolute (body coords)
  const scale=ONE/GR; const cI=cD.map(x=>x*scale); // in 2^-40 units, integer
  let exactCount=0, degenerate=0, stableIdx=[]; for(let i=0;i<T.length;i++){ const [a,b,c]=T[i]; const A=PI[a],B=PI[b],C=PI[c]; const n=cr(sub(B,A),sub(C,A)); let all=true, zero=false; for(const [u,v] of [[A,B],[B,C],[C,A]]){ const sg=dot(cr(sub(v,u),sub(cI,u)),n); if(sg<=0n){ all=false; } if(sg===0n) zero=true; } if(all){ exactCount++; stableIdx.push(i); } if(zero) degenerate++; }
  // body strictly contains c (exact): n.c < n.A for every face
  let exactInside=true; for(const [a,b,c] of T){ const n=cr(sub(PI[b],PI[a]),sub(PI[c],PI[a])); if(dot(n,cI)>=dot(n,PI[a])) exactInside=false; }
  res=Object.assign(res,{found:true,shiftPctRadius:100*best.d/rm,shift:best.c,dir:best.c.map(x=>x/best.d),stableFace:q.w,marginWanted:wm,marginOtherMax:other,cDyadicNum:cD.map(String),cDyadicDen:'2^30 (absolute body coordinates, 2^-40-scaled vertices)',exact:{S_atC:exactCount,degenerateEdges:degenerate,cInsideStrict:exactInside,polyConvexCert:r0.convexCert,globalViolations:globalConvexCert(PI,T).violations}});
  if(process.argv[4]) fs.writeFileSync(process.argv[4],JSON.stringify({vertices:J.vertices,faces:J.faces,scale:'2^40',com:cD.map(String),comDen:'2^30',stableFace:q.w,res}));
} else res.found=false;
console.log(JSON.stringify(res));
