// Round 15 gate helper: node r15-dump.mjs body.json out.json  -> exact (BigInt) classification of the body at its CoM (file 'com' if present, else centroid).
// Output: float vertices, triangles (outward), c (float), exact stable faces, tipping edge list (i->j), saddle edges, peaks (unstable vertices).
import fs from 'fs'; import {quantize,buildHull,exactCheck,globalConvexCert} from './poly-check.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); let PI=J.vertices.map(p=>p.map(BigInt)); let T=buildHull(PI); { const used=[...new Set(T.flat())].sort((a,b)=>a-b); const mp=new Map(used.map((v,i)=>[v,i])); PI=used.map(v=>PI[v]); T=T.map(t=>t.map(v=>mp.get(v))); }
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const r=exactCheck(PI,T); const g=globalConvexCert(PI,T);
let out;
if(!J.com){ out={mode:'homogeneous',S:r.S,U:r.U,H:r.H,stable:r.stableFaces,peaks:r.peaks,saddles:r.saddles,tip:r.tipEdgeList,c:r.centroid,convexCert:r.convexCert,global:g}; }
else { // weighted: exact classification at c (dyadic) using the same sign tests as poly-check.mjs
  const Cn=J.com.map(BigInt), D=1n; const V=PI.length,F=T.length,key=(a,b)=>a*V+b; const dir=new Map(); T.forEach((t,i)=>{ for(let k=0;k<3;k++) dir.set(key(t[k],t[(k+1)%3]),i); });
  const NRM=T.map(([a,b,c])=>cr(sub(PI[b],PI[a]),sub(PI[c],PI[a])));
  const tip=[],stable=[]; for(let i=0;i<F;i++){ const t=T[i]; let nv=0; for(let k=0;k<3;k++){ const a=t[k],b=t[(k+1)%3]; const e=sub(PI[b],PI[a]); const w=sub(Cn,PI[a]); const s=dot(cr(e,w),NRM[i]); if(s<0n){ nv++; tip.push([i,dir.get(key(b,a))]); } } if(!nv) stable.push(i); }
  const saddles=[]; for(const [kk,i] of dir){ const a=Math.floor(kk/V), b=kk%V; if(a>b) continue; const j=dir.get(key(b,a)); const e=sub(PI[b],PI[a]); const w=sub(Cn,PI[a]); const we=dot(w,e), ee=dot(e,e); if(!(we>0n&&we<ee)) continue; const Vv=[we*e[0]-ee*w[0],we*e[1]-ee*w[1],we*e[2]-ee*w[2]]; const nf=NRM[i],ng=NRM[j]; const s0=dot(cr(nf,ng),e); const al=dot(cr(Vv,ng),e), be=dot(cr(nf,Vv),e); const sg=x=>x>0n?1:x<0n?-1:0; if(sg(al)*sg(s0)>0&&sg(be)*sg(s0)>0) saddles.push([a,b]); }
  const nb=Array.from({length:V},()=>[]); for(const kk of dir.keys()){ nb[Math.floor(kk/V)].push(kk%V); } const peaks=[]; for(let v=0;v<V;v++){ const vp=sub(PI[v],Cn); if(nb[v].every(w=>dot(sub(PI[w],PI[v]),vp)<0n)) peaks.push(v); }
  out={mode:'weighted',S:stable.length,U:peaks.length,H:saddles.length,stable,peaks,saddles,tip,c:Cn.map(x=>Number(x)),convexCert:r.convexCert,global:g};
}
out.P=PI.map(p=>p.map(x=>Number(x))); out.T=T; out.scale=2**40; if(out.mode==='homogeneous') out.c=out.c.map(x=>x*2**40);
fs.writeFileSync(process.argv[3],JSON.stringify(out)); console.log(process.argv[2],out.mode,'S',out.S,'U',out.U,'H',out.H,'F',T.length,'V',PI.length,'cert',out.convexCert);
