import fs from 'fs'; import vm from 'vm'; import {icosphere,sph} from './verify.mjs';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
export function findCritical(S,L){
  const {V}=icosphere(L); const r={h:0,x:[0,0,0],n:[0,0,0]}; const e1=[0,0,0],e2=[0,0,0];
  function grad(u,e1,e2,a,b){ const v=[u[0]+a*e1[0]+b*e2[0],u[1]+a*e1[1]+b*e2[1],u[2]+a*e1[2]+b*e2[2]]; G.norm(v); S.support(v,null,r); const d=r.x[0]*v[0]+r.x[1]*v[1]+r.x[2]*v[2];
    const g=[r.x[0]-d*v[0],r.x[1]-d*v[1],r.x[2]-d*v[2]]; return [g[0]*e1[0]+g[1]*e1[1]+g[2]*e1[2], g[0]*e2[0]+g[1]*e2[1]+g[2]*e2[2], v]; }
  const roots=[];
  for(const u0 of V){ let u=u0.slice(), ok=false, lam=1e-3;
    for(let it=0;it<80;it++){ G.basis(u,e1,e2); const g0=grad(u,e1,e2,0,0); const gn=Math.hypot(g0[0],g0[1]); if(gn<1e-9){ok=true;break;}
      const e=2e-4; const ga=grad(u,e1,e2,e,0),gA=grad(u,e1,e2,-e,0),gb=grad(u,e1,e2,0,e),gB=grad(u,e1,e2,0,-e);
      let J=[(ga[0]-gA[0])/(2*e),(gb[0]-gB[0])/(2*e),(ga[1]-gA[1])/(2*e),(gb[1]-gB[1])/(2*e)]; // J[i][j]=dG_i/dx_j
      // LM: (J^T J + lam I) d = -J^T g
      let best=null;
      for(let tries=0;tries<12;tries++){ const A=[J[0]*J[0]+J[2]*J[2]+lam,J[0]*J[1]+J[2]*J[3],J[0]*J[1]+J[2]*J[3],J[1]*J[1]+J[3]*J[3]+lam]; const b=[-(J[0]*g0[0]+J[2]*g0[1]),-(J[1]*g0[0]+J[3]*g0[1])]; const det=A[0]*A[3]-A[1]*A[2];
        let d=[(A[3]*b[0]-A[1]*b[1])/det,(-A[2]*b[0]+A[0]*b[1])/det]; const m=Math.hypot(...d); if(m>0.1){d[0]*=0.1/m;d[1]*=0.1/m;}
        const t=grad(u,e1,e2,d[0],d[1]); if(Math.hypot(t[0],t[1])<gn){ best=t[2]; lam=Math.max(lam/3,1e-12); break; } lam*=4; }
      if(!best) break; u=best; }
    if(ok){ let found=roots.find(R=>Math.acos(Math.min(1,R.u[0]*u[0]+R.u[1]*u[1]+R.u[2]*u[2]))<2e-4); if(found) found.n++; else roots.push({u,n:1}); } else roots.fails=(roots.fails||0)+1; }
  // classify with Hessian of h on the sphere (eigenvalues of d(G)/dx, symmetric)
  for(const R of roots){ G.basis(R.u,e1,e2); const e=1e-3; const ga=grad(R.u,e1,e2,e,0),gA=grad(R.u,e1,e2,-e,0),gb=grad(R.u,e1,e2,0,e),gB=grad(R.u,e1,e2,0,-e);
    const a=(ga[0]-gA[0])/(2*e), b=((gb[0]-gB[0])+(ga[1]-gA[1]))/(4*e), d=(gb[1]-gB[1])/(2*e); const tr=a+d, det=a*d-b*b, disc=Math.sqrt(Math.max(0,tr*tr/4-det)); R.ev=[tr/2-disc,tr/2+disc]; S.support(R.u,null,r); R.h=r.h;
    R.type=R.ev[0]>0?'min':R.ev[1]<0?'max':'saddle'; }
  return {roots,starts:V.length};
}
if(process.argv[1].endsWith('crit.mjs')){ const beta=+process.argv[2]||0.02; const S=(process.env.SHAPEFILE?new G.Shape(JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8'))):new G.Shape(beta));
 for(const L of (process.argv[3]||'3,4,5').split(',').map(Number)){ const {roots,starts}=findCritical(S,L); const c={min:0,max:0,saddle:0}; roots.forEach(R=>c[R.type]++);
  console.log(`beta=${beta} starts=${starts} (icosphere L=${L}): distinct critical points=${roots.length} min=${c.min} max=${c.max} saddle=${c.saddle} chi=${c.min-c.saddle+c.max} failedStarts=${roots.fails||0}`);
  if(process.env.OUT){ const sj=JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8')); const mn=roots.find(R=>R.type==='min'), mx=roots.find(R=>R.type==='max'); fs.writeFileSync(process.env.OUT,JSON.stringify({Lmax:sj.Lmax,flat:sj.flat,stable:mn.u,unstable:mx.u,c:sj.c})); }
  for(const R of roots) console.log('  ',R.type,'h='+R.h.toFixed(9),JSON.stringify(sph(R.u)),'hess eig',R.ev.map(x=>x.toFixed(5)).join(','),'basin starts',R.n); }
}
