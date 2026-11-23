// Rewrites the farm-body data block of tools/gomboc-spike.html from runs/farm/catalogue.json (PD-207, lane v42-gomboc-page).
//   node page-bodies.mjs 018,017,019,011,007,012      (ids; default = this list)
// The block sits between the markers /*FARM-BEGIN*/ and /*FARM-END*/ (one line) and pushes onto EXACTS, the same array that holds the round 10 exact bodies.
import fs from 'fs'; import vm from 'vm'; import path from 'path';
import {TOOLS,ROOT,catalogue} from './lib.mjs'; import {familyF,project} from '../ring-family.mjs';
const SH=vm.runInNewContext(fs.readFileSync(path.join(TOOLS,'sh.js'),'utf8')+';SH');
const ids=(process.argv[2]||'018,017,019,011,007,012').split(',');
const html=path.join(ROOT,'tools','gomboc-spike.html');
const nrm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
// extremum of r^4 = 1+sum c Y (the page's shape series) by a coarse Fibonacci scan plus local polish
function extremum(c,Lmax,sign){ const B=SH.make(Lmax,2),buf=new Float64Array(B.N); const f=u=>{B.eval(u[0],u[1],u[2],buf);let s=1;for(let k=0;k<B.N;k++)s+=c[k]*buf[k];return sign*s;};
  let best=null,bv=1e9;const n=6000;for(let i=0;i<n;i++){const z=1-(2*i+1)/n,r=Math.sqrt(1-z*z),a=i*Math.PI*(3-Math.sqrt(5));const u=[r*Math.cos(a),r*Math.sin(a),z];const v=f(u);if(v<bv){bv=v;best=u;}}
  let u=best,step=0.02;for(let it=0;it<400&&step>1e-9;it++){let imp=false;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const w=nrm([u[0]+step*a,u[1]+step*b,u[2]+step*(a-b)*0.5+step*0.3*(a+b)]);const v=f(w);if(v<bv){bv=v;u=w;imp=true;}}
    if(!imp){ // try tangent moves
      const e1=nrm(Math.abs(u[0])<0.9?[0,u[2],-u[1]]:[-u[2],0,u[0]]),e2=[u[1]*e1[2]-u[2]*e1[1],u[2]*e1[0]-u[0]*e1[2],u[0]*e1[1]-u[1]*e1[0]];
      for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const w=nrm(u.map((x,i)=>x+step*(a*e1[i]+b*e2[i])));const v=f(w);if(v<bv){bv=v;u=w;imp=true;}} }
    if(!imp) step/=2; }
  return u; }
const fmt=(x,d=6)=>+x.toPrecision(d);
const cat=catalogue().bodies; const out=[];
for(const id of ids){ const b=cat.find(x=>x.id===id); if(!b) throw new Error('no body '+id);
  const r=project(familyF(b.params),12); const c=r.c.map(v=>+v.toPrecision(9));
  const zs=extremum(c,12,1), zu=extremum(c,12,-1);   // stable = min radius, unstable = max radius (r^4 monotone in r)
  const rat=Math.pow(1,0); // ratio is taken from the catalogue (radial-function ratio)
  const near=b.nearestId.startsWith('r10:')?'round 10 exact body '+b.nearestId.slice(4):'body '+b.nearestId;
  const pct=(100*b.nearestDist).toFixed(2);
  const txt='NUMERICALLY VERIFIED, NOT PROVEN: 1 stable + 1 unstable equilibrium, gradient winding index +2/-0 at icosphere L5, L6 and L7. Ratio r_max/r_min '+b.ratio.toFixed(3)+'; convexity (support-function K min) '+b.Kmin.toFixed(3)+'; second-minimum persistence '+b.persistenceL6+(b.persistenceL6<=1e-4?' (at the sampling floor)':'')+'; centre-of-mass tolerance region M has '+b.Msize+' grid cells (recomputed at L6; the uniform copy tolerates a small CoM move only). Shape distance to its nearest neighbour in the catalogue: close relative of '+near+', '+pct+' percent of the mean radius (RMS); the farm bodies are variations of one family, not independent solutions. Zero CoM shift, homogeneous (uniform density, no insert). The catalogue ran 20 page-physics rolls at zero shift, all ending at one point'+(b.roll&&b.roll.meanTimeToRest?' (mean settle '+b.roll.meanTimeToRest+' s)':'')+'. One stable point: the body self-rights, but the last degrees can take a long time.';
  out.push({id:'f'+id,label:'Farm body '+id+', ratio '+b.ratio.toFixed(3)+' (verified numerically)',Lmax:12,ratio:fmt(b.ratio,4),stable:zs.map(v=>fmt(v)),unstable:zu.map(v=>fmt(v)),txt,c}); }
const line='/*FARM-BEGIN*/ const FARM_BODIES='+JSON.stringify(out)+'; EXACTS.push(...FARM_BODIES); /*FARM-END*/';
let s=fs.readFileSync(html,'utf8'); const i=s.indexOf('/*FARM-BEGIN*/');
if(i>=0){ const j=s.indexOf('/*FARM-END*/',i)+'/*FARM-END*/'.length; s=s.slice(0,i)+line+s.slice(j); }
else { const k=s.indexOf('const EXACTS='); const e=s.indexOf('\n',k); s=s.slice(0,e)+'\n'+line+s.slice(e); }
fs.writeFileSync(html,s); console.log('wrote',out.length,'farm bodies:',out.map(o=>o.id+' stable '+o.stable.join(',')+' unstable '+o.unstable.join(',')).join(' | '));
