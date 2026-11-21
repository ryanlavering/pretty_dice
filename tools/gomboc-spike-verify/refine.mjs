import fs from 'fs'; import vm from 'vm'; import {sph} from './verify.mjs';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc'); const sj=JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8')); const S=new G.Shape({c:sj.c,Lmax:sj.Lmax});
const starts=JSON.parse(process.argv[2]); // [[theta_deg,phi_deg],...] from index.mjs hits
const r={h:0,x:[0,0,0],n:[0,0,0]}; const e1=[0,0,0],e2=[0,0,0];
const mv=(u,a,b)=>{ G.basis(u,e1,e2); const v=[u[0]+a*e1[0]+b*e2[0],u[1]+a*e1[1]+b*e2[1],u[2]+a*e1[2]+b*e2[2]]; G.norm(v); return v; };
const H=u=>{ S.support(u,null,r); return r.h; };
function grad(u){ S.support(u,null,r); const d=r.x[0]*u[0]+r.x[1]*u[1]+r.x[2]*u[2]; const g=[r.x[0]-d*u[0],r.x[1]-d*u[1],r.x[2]-d*u[2]]; G.basis(u,e1,e2); return [g[0]*e1[0]+g[1]*e1[1]+g[2]*e1[2],g[0]*e2[0]+g[1]*e2[1]+g[2]*e2[2]]; }
const out=[];
for(const [th,ph] of starts){ const t=th*Math.PI/180,p=ph*Math.PI/180; let u=[Math.sin(p)*Math.cos(t),Math.sin(p)*Math.sin(t),Math.cos(p)];
  for(const sign of [1,-1]){ let v=u.slice(),step=0.03,f=sign*H(v); while(step>1e-6){ let imp=false; for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,-.7],[.7,-.7],[-.7,.7]]){ const w=mv(v,a*step,b*step); const fw=sign*H(w); if(fw>f+1e-15){f=fw;v=w;imp=true;break;} } if(!imp) step/=2; }
    // Newton on tangential gradient
    for(let it=0;it<30;it++){ const g=grad(v); if(Math.hypot(...g)<1e-12) break; const ee=1e-4; const ga=grad(mv(v,ee,0)),gA=grad(mv(v,-ee,0)),gb=grad(mv(v,0,ee)),gB=grad(mv(v,0,-ee)); G.basis(v,e1,e2); // approx: chart bases differ per point; use same-point finite difference via mv (basis fixed at v)
      const J=[(ga[0]-gA[0])/(2*ee),(gb[0]-gB[0])/(2*ee),(ga[1]-gA[1])/(2*ee),(gb[1]-gB[1])/(2*ee)]; const det=J[0]*J[3]-J[1]*J[2]; if(Math.abs(det)<1e-18) break; const d=[-(J[3]*g[0]-J[1]*g[1])/det,-(-J[2]*g[0]+J[0]*g[1])/det]; const m=Math.hypot(...d); const sc=m>0.02?0.02/m:1; v=mv(v,d[0]*sc,d[1]*sc); }
    const g=grad(v); const ee=2e-3; const f0=H(v),fa=H(mv(v,ee,0)),fA=H(mv(v,-ee,0)),fb=H(mv(v,0,ee)),fB=H(mv(v,0,-ee)),fab=H(mv(v,ee,ee)),fAB=H(mv(v,-ee,-ee)); const ha=(fa-2*f0+fA)/(ee*ee),hd=(fb-2*f0+fB)/(ee*ee),hb=(fab+fAB-fa-fA-fb-fB+2*f0)/(2*ee*ee); const tr=ha+hd,dt=ha*hd-hb*hb,ds=Math.sqrt(Math.max(0,tr*tr/4-dt)); out.push({eig:[tr/2-ds,tr/2+ds].map(x=>+x.toFixed(5)),kind:sign>0?'max':'min',u:v,h:H(v),gradNorm:Math.hypot(...g),sph:sph(v)}); } }
console.log(JSON.stringify(out.map(o=>({...o,u:o.u.map(x=>+x.toFixed(9))})),null,0));
fs.writeFileSync('refine_out.json',JSON.stringify(out));
