// Shared helpers for the Goemboec farm (PD-207): radial function of the ring family (degree-1 part removed, as in ring-pers.mjs), shape signature, de-duplication distance.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
export const HERE=path.dirname(fileURLToPath(import.meta.url)); export const TOOLS=path.join(HERE,'..'); export const ROOT=path.join(TOOLS,'..','..');
export const FARM=process.env.FARM_DIR||path.join(ROOT,'runs','farm');
const Fraw=q=>{ const g=k=>q[k]||0; return (x,y,z)=>{ const t=z, s2=Math.max(0,1-t*t), s=Math.sqrt(s2); const th=Math.atan2(y,x); const A=s*(g('a0')+g('a1')*t+g('a2')*t*t+g('a3')*t**3), P=g('p1')*t+g('p3')*t**3+g('p5')*t**5; const B=s2*(g('b0')+g('b1')*t*t+g('b2')*t**4), Q=g('q0')+g('q2')*t*t+g('q4')*t**4; return 1+A*Math.cos(th-P)+B*Math.cos(2*th-Q)+s2*s*g('c3')*Math.cos(3*th)+g('e')*(3*t*t-1)+g('e4')*(35*t**4-30*t*t+3); }; };
function gl(n){ const nodes=[],w=[]; for(let i=0;i<n;i++){ let x=Math.cos(Math.PI*(i+.75)/(n+.5)),pp; for(let it=0;it<100;it++){ let p0=1,p1=x; for(let k=2;k<=n;k++){ const p2=((2*k-1)*x*p1-(k-1)*p0)/k; p0=p1;p1=p2; } pp=n*(x*p1-p0)/(x*x-1); const dx=p1/pp; x-=dx; if(Math.abs(dx)<1e-15) break; } nodes.push(x); w.push(2/((1-x*x)*pp*pp)); } return {nodes,w}; }
const GQ=(()=>{ const nz=40,nt=80,{nodes,w}=gl(nz); const pts=[]; for(let i=0;i<nz;i++){ const z=nodes[i],s=Math.sqrt(1-z*z); for(let j=0;j<nt;j++){ const t=(j+.5)*2*Math.PI/nt; pts.push([s*Math.cos(t),s*Math.sin(t),z,w[i]*2*Math.PI/nt]); } } return pts; })();
export function radial(q){ const f0=Fraw(q); const m=[0,0,0]; let mean=0; for(const p of GQ){ const f=f0(p[0],p[1],p[2]); for(let k=0;k<3;k++) m[k]+=f*p[k]*p[3]; mean+=f*p[3]; } mean/=4*Math.PI; const mm=m.map(v=>3/(4*Math.PI)*v);
  const F=(x,y,z)=>(f0(x,y,z)-(mm[0]*x+mm[1]*y+mm[2]*z))/mean; return (x,y,z)=>Math.pow(Math.max(F(x,y,z),1e-9),0.25); }
const fib=n=>Array.from({length:n},(_,i)=>{ const z=1-(2*i+1)/n, r=Math.sqrt(1-z*z), a=i*Math.PI*(3-Math.sqrt(5)); return [r*Math.cos(a),r*Math.sin(a),z]; });
const FIB200=fib(200), FIB4000=fib(4000);
const nrm=v=>{ const l=Math.hypot(...v); return v.map(x=>x/l); }; const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function extremum(r,sign){ let best=null,bv=1e9; for(const p of FIB4000){ const v=sign*r(...p); if(v<bv){ bv=v; best=p; } }
  let u=best, step=0.03; for(let it=0;it<60;it++){ const e1=nrm(cross(u,Math.abs(u[0])<0.9?[1,0,0]:[0,1,0])), e2=cross(u,e1); let imp=false; for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){ const v=nrm([u[0]+step*(a*e1[0]+b*e2[0]),u[1]+step*(a*e1[1]+b*e2[1]),u[2]+step*(a*e1[2]+b*e2[2])]); const val=sign*r(...v); if(val<bv){ bv=val; u=v; imp=true; } } if(!imp) step/=2; } return u; }
// signature: radial function (mean 1) on a 200-point Fibonacci set in the frame stable point -> +z, unstable point -> xz-plane (+x side); plus its mirror image (chirality-free comparison)
export function signature(q){ const r=radial(q); const zs=extremum(r,1), zu=extremum(r,-1); const ez=zs; let ex=nrm([zu[0]-dot(zu,ez)*ez[0],zu[1]-dot(zu,ez)*ez[1],zu[2]-dot(zu,ez)*ez[2]]); const ey=cross(ez,ex);
  let mean=0; for(const p of GQ) mean+=r(p[0],p[1],p[2])*p[3]; mean/=4*Math.PI;
  const at=(sy)=>FIB200.map(p=>{ const x=p[0],y=sy*p[1],z=p[2]; return r(x*ex[0]+y*ey[0]+z*ez[0],x*ex[1]+y*ey[1]+z*ez[1],x*ex[2]+y*ey[2]+z*ez[2])/mean; });
  const sig=at(1), mir=at(-1); const sorted=sig.slice().sort((a,b)=>a-b); const rmax=r(...zu), rmin=r(...zs);
  return {sig:sig.map(v=>+v.toFixed(6)),mir:mir.map(v=>+v.toFixed(6)),sorted:sorted.map(v=>+v.toFixed(6)),ratio:rmax/rmin,stable:zs,unstable:zu}; }
const rms=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/a.length);
export const sigDist=(A,B)=>Math.min(rms(A.sig,B.sig),rms(A.sig,B.mir));   // fraction of mean radius
export const sortedDist=(A,B)=>rms(A.sorted,B.sorted);
export function readJSON(f,d=null){ try{ return JSON.parse(fs.readFileSync(f,'utf8')); }catch(e){ return d; } }
export function writeAtomic(f,obj){ const t=f+'.tmp'+process.pid; fs.writeFileSync(t,JSON.stringify(obj)); fs.renameSync(t,f); }
export function refBodies(){ // verified round 10 bodies, used as de-duplication references and as start pool
  const names=['p_1.12_s1','p_1.15_s2','t_1.16_s2','t_1.17_s1','w_1.18_t_1.17_s1_s5']; return names.map(n=>{ const j=readJSON(path.join(TOOLS,'runs','r10',n+'.json')); return j&&j.params?{id:'r10:'+n,params:j.params,ratio:j.ratio}:null; }).filter(Boolean); }
export function catalogue(){ return readJSON(path.join(FARM,'catalogue.json'),{bodies:[]}); }
export function nearest(sig,{refs=true}={}){ let best={dist:Infinity,id:null}; const cat=catalogue().bodies; const all=[...cat.map(b=>({id:b.id,params:b.params})),...(refs&&!process.env.FARM_NOREF?refBodies():[])];
  for(const b of all){ const s=b.sigObj||(b.sigObj=signature(b.params)); const d=sigDist(sig,s); if(d<best.dist) best={dist:d,id:b.id}; } return best; }
