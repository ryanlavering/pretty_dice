// Fit r^4 of a star-shaped body (ray-cast samples from mesh-radial.mjs) with a spherical-harmonic series; report error versus parameter count.
//   node fit-sh.mjs radial.json [--levels 4,6,8,10,12,14] [--write out.json --lmax 12]
// out.json is {Lmax, c[], flat, stable, unstable} in the same format as pronounced-shape.json (coefficients of r^4 = 1 + sum_{l>=2} c Y, degree 1 forced to zero = CoM at the origin).
import fs from 'fs'; import vm from 'vm'; import {icosphere} from './verify.mjs';
const SH=vm.runInNewContext(fs.readFileSync(new URL('./sh.js',import.meta.url),'utf8')+';SH');
const a=process.argv.slice(2); const get=(k,d)=>{ const i=a.indexOf(k); return i>=0?a[i+1]:d; };
const j=JSON.parse(fs.readFileSync(a[0],'utf8')); const ico=icosphere(j.level); const D=ico.V; let r=Float64Array.from(j.r);
// fill misses with the mean of the 8 nearest valid samples
const good=[]; r.forEach((x,i)=>{ if(x>0) good.push(i); }); for(let i=0;i<r.length;i++) if(!(r[i]>0)){ const d=good.map(k=>({k,s:D[k][0]*D[i][0]+D[k][1]*D[i][1]+D[k][2]*D[i][2]})).sort((x,y)=>y.s-x.s).slice(0,8); r[i]=d.reduce((s,x)=>s+r[x.k],0)/8; }
const F=Array.from(r,x=>x**4); const rm=r.reduce((s,x)=>s+x,0)/r.length;
function chol(A,n){ const L=Array.from({length:n},()=>new Float64Array(n)); for(let i=0;i<n;i++) for(let k=0;k<=i;k++){ let s=A[i][k]; for(let m=0;m<k;m++) s-=L[i][m]*L[k][m]; if(i===k) L[i][i]=Math.sqrt(Math.max(s,1e-14)); else L[i][k]=s/L[k][k]; } return L; }
function solve(A,b,n){ const L=chol(A,n); const y=new Float64Array(n); for(let i=0;i<n;i++){ let s=b[i]; for(let k=0;k<i;k++) s-=L[i][k]*y[k]; y[i]=s/L[i][i]; } const x=new Float64Array(n); for(let i=n-1;i>=0;i--){ let s=y[i]; for(let k=i+1;k<n;k++) s-=L[k][i]*x[k]; x[i]=s/L[i][i]; } return x; }
const levels=get('--levels','4,6,8,10,12,14').split(',').map(Number); const results=[];
for(const Lmax of levels){ const B=SH.make(Lmax,0); const N=B.N; const Y=D.map(u=>{ const o=new Float64Array(N); B.eval(u[0],u[1],u[2],o); return o; });
  const A=Array.from({length:N},()=>new Float64Array(N)), bb=new Float64Array(N); for(let s=0;s<D.length;s++){ const y=Y[s]; for(let p=0;p<N;p++){ bb[p]+=y[p]*F[s]; for(let q=0;q<=p;q++) A[p][q]+=y[p]*y[q]; } } for(let p=0;p<N;p++) for(let q=p+1;q<N;q++) A[p][q]=A[q][p]; for(let p=0;p<N;p++) A[p][p]+=1e-9;
  const x=solve(A,bb,N); const i0=B.terms.findIndex(t=>t.l===0), y00=B.terms[i0].n, F0=x[i0]*y00;
  const c=new Float64Array(N); let l1=0; B.terms.forEach((t,i)=>{ if(t.l===1) l1=Math.max(l1,Math.abs(x[i]/(F0))*Math.sqrt(4*Math.PI)); if(t.l>=2) c[i]=x[i]/F0; });   // F/F0 = 1 + sum c_i Y_i * (1/y00 scaling folded below)
  // F/F0 = 1 + sum_i (x_i/F0) Y_i  (since F0 = x_0*y00 and Y_0 = y00)
  let se=0,me=0,mn=1e9,mx=0; for(let s=0;s<D.length;s++){ let f=1; for(let p=0;p<N;p++) if(B.terms[p].l>=2) f+=c[p]*Y[s][p]; const rf=Math.pow(Math.max(f,1e-6)*F0,0.25); const e=Math.abs(rf-r[s])/rm; se+=e*e; me=Math.max(me,e); mn=Math.min(mn,rf); mx=Math.max(mx,rf); }
  const nonzero=B.terms.filter((t,i)=>t.l>=2&&Math.abs(c[i])>1e-5).length; const nparam=B.terms.filter(t=>t.l>=2).length;
  console.log(`Lmax ${Lmax}: parameters (l=2..${Lmax}) ${nparam} (${nonzero} above 1e-5), degree-1 residual ${l1.toExponential(2)} (CoM check), radial error rms ${(100*Math.sqrt(se/D.length)).toFixed(3)} percent, max ${(100*me).toFixed(3)} percent of mean radius, fitted r_max/r_min ${(mx/mn).toFixed(4)} (samples ${(Math.max(...r)/Math.min(...r)).toFixed(4)})`);
  results.push({Lmax,c:Array.from(c).filter((v,i)=>B.terms[i].l>=2)}); }
const w=get('--write',null); if(w){ const L=+get('--lmax',12); const R=results.find(q=>q.Lmax===L); fs.writeFileSync(w,JSON.stringify({Lmax:L,flat:null,c:R.c.map(v=>+v.toPrecision(9)),source:'fit of ray-cast radius of an external mesh (not committed)'})); console.log('wrote',w,R.c.length,'coefficients'); }
