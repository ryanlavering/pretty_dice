import fs from 'fs'; import vm from 'vm'; import {icosphere} from './verify.mjs';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
export function convexity(S,L){ const {V}=icosphere(L); const J=new Array(9), e1=[0,0,0],e2=[0,0,0]; let rmin=1e9,rmax=0,Kmin=1e9,Kmax=-1e9,hmin=1e9,hmax=-1e9,rrmin=1e9,rrmax=0; const r={h:0,x:[0,0,0],n:[0,0,0]};
 for(const u of V){ S.jac(u,null,J); G.basis(u,e1,e2); const t=(a,b)=>{const v=G.matvec(J,b); return v[0]*a[0]+v[1]*a[1]+v[2]*a[2];}; const a=t(e1,e1),b=0.5*(t(e1,e2)+t(e2,e1)),d=t(e2,e2);
  const tr=a+d,det=a*d-b*b,disc=Math.sqrt(Math.max(0,tr*tr/4-det)); const l1=tr/2-disc,l2=tr/2+disc; rmin=Math.min(rmin,l1); rmax=Math.max(rmax,l2); Kmin=Math.min(Kmin,1/(l1*l2)); Kmax=Math.max(Kmax,1/(l1*l2));
  S.support(u,null,r); hmin=Math.min(hmin,r.h); hmax=Math.max(hmax,r.h); const rr=Math.hypot(...r.x); rrmin=Math.min(rrmin,rr); rrmax=Math.max(rrmax,rr); }
 return {rhoMin:rmin,rhoMax:rmax,Kmin,Kmax,hmin,hmax,rmin:rrmin,rmax:rrmax}; }
if(process.argv[1].endsWith('convex.mjs')) for(const b of (process.argv[2]||'0.02').split(',').map(Number)){ const S=(process.env.SHAPEFILE?new G.Shape(JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8'))):new G.Shape(b)); console.log('beta',b,JSON.stringify(convexity(S,4))); }
