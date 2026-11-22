// ---- Goemboc core: shape, support function, rolling dynamics (no dependencies) ----
// Real spherical harmonics, degrees 2..Lmax (degree 0,1 excluded: degree 1 would move the centre of mass), orthonormal on the unit sphere.
const SH=(function(){
 function make(Lmax){ const terms=[]; for(let l=2;l<=Lmax;l++) for(let m=0;m<=l;m++){ let f=1; for(let k=l-m+1;k<=l+m;k++) f/=k; // (l-m)!/(l+m)!
   let nrm=Math.sqrt((2*l+1)/(4*Math.PI)*f)*(m>0?Math.SQRT2:1); terms.push({l,m,c:0,n:nrm,type:'c'}); if(m>0) terms.push({l,m,c:0,n:nrm,type:'s'}); }
  const N=terms.length; const Q=[]; for(let l=0;l<=Lmax;l++) Q.push(new Float64Array(l+1));
  const mc=new Float64Array(Lmax+1), ms=new Float64Array(Lmax+1);
  function eval(x,y,z,out){ // fills out[i] = Y_i(x,y,z)
    mc[0]=1; ms[0]=0; for(let m=1;m<=Lmax;m++){ mc[m]=mc[m-1]*x-ms[m-1]*y; ms[m]=ms[m-1]*x+mc[m-1]*y; }
    let df=1; for(let m=0;m<=Lmax;m++){ Q[m][m]=df; df*=(2*m+1); if(m+1<=Lmax) Q[m+1][m]=z*(2*m+1)*Q[m][m]; for(let l=m+2;l<=Lmax;l++) Q[l][m]=((2*l-1)*z*Q[l-1][m]-(l+m-1)*Q[l-2][m])/(l-m); }
    for(let i=0;i<N;i++){ const t=terms[i]; const q=Q[t.l][t.m]*t.n; out[i]=t.type==='c'?q*mc[t.m]:q*ms[t.m]; } }
  return {N,terms,eval,Lmax}; }
 return {make}; })();

const Gomboc=(function(){
const PI=Math.PI;
// Sloan (2023) second construction: r^4 = 1 + 4*beta*sin(phi)*cos(theta - P(phi)), P(phi)=(3pi/2)(cos phi - cos^3 phi/3).
// With u=(x,y,z) a unit vector: sin(phi)cos(theta-P) = x cosP + y sinP, cos(phi)=z (smooth everywhere, poles included).
function Shape(arg){
  const S=this; let beta=null; if(typeof arg==='number'){ beta=arg; } S.beta=beta;
  // radial function about the construction origin O
  if(beta!==null){ const b4=4*beta; S.r=function(x,y,z){ const c=z, P=1.5*PI*(c-c*c*c/3); return Math.sqrt(Math.sqrt(1+b4*(x*Math.cos(P)+y*Math.sin(P)))); }; }
  else { // spherical-harmonic body: r^4 = 1 + sum_{l=2..Lmax} c_i Y_i (no degree 1 => centre of mass exactly at the origin)
    const shb=SH.make(arg.Lmax), cf=Float64Array.from(arg.c), buf=new Float64Array(shb.N), N=shb.N; S.sh=arg;
    S.r=function(x,y,z){ shb.eval(x,y,z,buf); let s=1; for(let i=0;i<N;i++) s+=cf[i]*buf[i]; return Math.sqrt(Math.sqrt(s)); }; }
  // quadrature: volume, centroid c, second moments about c (Gauss-Legendre in cos(phi), uniform in theta)
  const NZ=160, NT=320; const {nodes,weights}=gaussLegendre(NZ);
  let V=0, cx=0,cy=0,cz=0; const M=[0,0,0,0,0,0]; // xx,yy,zz,xy,xz,yz about O
  for(let i=0;i<NZ;i++){ const z=nodes[i], w=weights[i], s=Math.sqrt(1-z*z);
    for(let j=0;j<NT;j++){ const t=(j+.5)*2*PI/NT, x=s*Math.cos(t), y=s*Math.sin(t), r=S.r(x,y,z), dw=w*2*PI/NT;
      const r3=r*r*r, r4=r3*r, r5=r4*r; V+=dw*r3/3; cx+=dw*r4/4*x; cy+=dw*r4/4*y; cz+=dw*r4/4*z;
      const q=dw*r5/5; M[0]+=q*x*x; M[1]+=q*y*y; M[2]+=q*z*z; M[3]+=q*x*y; M[4]+=q*x*z; M[5]+=q*y*z; } }
  const c=[cx/V,cy/V,cz/V]; S.c=c; S.V=V; S.mass=1;
  // covariance about CoM, per unit mass: S_c = M/V - c c^T ; inertia (unit mass) = tr(S)E - S
  const Sx=[M[0]/V-c[0]*c[0],M[3]/V-c[0]*c[1],M[4]/V-c[0]*c[2], M[3]/V-c[0]*c[1],M[1]/V-c[1]*c[1],M[5]/V-c[1]*c[2], M[4]/V-c[0]*c[2],M[5]/V-c[1]*c[2],M[2]/V-c[2]*c[2]];
  const tr=Sx[0]+Sx[4]+Sx[8]; S.I=[tr-Sx[0],-Sx[1],-Sx[2], -Sx[3],tr-Sx[4],-Sx[5], -Sx[6],-Sx[7],tr-Sx[8]];
  S.Iavg=(S.I[0]+S.I[4]+S.I[8])/3; S.c0=c.slice();
  // approximate mode: move the centre of mass by vec (body frame, in body-radius units). The surface point relative to the CoM is r*u - c, so c += vec. Inertia is not re-referenced (change is O(|vec|^2)).
  S.setNudge=function(vec){ c[0]=S.c0[0]+vec[0]; c[1]=S.c0[1]+vec[1]; c[2]=S.c0[2]+vec[2]; };
  // surface point (relative to CoM) for unit direction u
  S.point=function(x,y,z,out){ const r=S.r(x,y,z); out[0]=r*x-c[0]; out[1]=r*y-c[1]; out[2]=r*z-c[2]; return out; };
  // f(u0 + a e1 + b e2) = (x.u) at surface point in direction n = normalize(.) ; maximised => support function h(u)
  const tmp=[0,0,0];
  function F(n0,e1,e2,a,b,u){ let x=n0[0]+a*e1[0]+b*e2[0], y=n0[1]+a*e1[1]+b*e2[1], z=n0[2]+a*e1[2]+b*e2[2]; const l=1/Math.sqrt(x*x+y*y+z*z); x*=l;y*=l;z*=l;
    const r=S.r(x,y,z); return (r*x-c[0])*u[0]+(r*y-c[1])*u[1]+(r*z-c[2])*u[2]; }
  // support(u, guess): returns {h, x:[contact point rel. CoM], n:[surface direction from O]}; Newton on tangent chart.
  S.support=function(u,guess,res){
    res=res||{h:0,x:[0,0,0],n:[0,0,0],it:0}; let n=guess?guess.slice():u.slice();
    const e1=[0,0,0],e2=[0,0,0];
    for(let it=0;it<12;it++){
      basis(n,e1,e2); const e=4e-4, E=1e-3;
      const f0=F(n,e1,e2,0,0,u);
      const fa=F(n,e1,e2,e,0,u), fA=F(n,e1,e2,-e,0,u), fb=F(n,e1,e2,0,e,u), fB=F(n,e1,e2,0,-e,u);
      const ga=(fa-fA)/(2*e), gb=(fb-fB)/(2*e);
      if(Math.abs(ga)+Math.abs(gb)<1e-12){ res.it=it; break; }
      const Fa=F(n,e1,e2,E,0,u), FA=F(n,e1,e2,-E,0,u), Fb=F(n,e1,e2,0,E,u), FB=F(n,e1,e2,0,-E,u), Fab=F(n,e1,e2,E,E,u), FAB=F(n,e1,e2,-E,-E,u), FaB=F(n,e1,e2,E,-E,u), FAb=F(n,e1,e2,-E,E,u);
      const haa=(Fa-2*f0+FA)/(E*E), hbb=(Fb-2*f0+FB)/(E*E), hab=(Fab-FaB-FAb+FAB)/(4*E*E);
      const det=haa*hbb-hab*hab; let da,db;
      if(haa<0&&det>0){ da=-(hbb*ga-hab*gb)/det; db=-(-hab*ga+haa*gb)/det; } else { da=ga*0.5; db=gb*0.5; }
      const m=Math.hypot(da,db); if(m>0.2){ da*=0.2/m; db*=0.2/m; }
      let x=n[0]+da*e1[0]+db*e2[0], y=n[1]+da*e1[1]+db*e2[1], z=n[2]+da*e1[2]+db*e2[2]; const l=1/Math.sqrt(x*x+y*y+z*z); n[0]=x*l;n[1]=y*l;n[2]=z*l;
      res.it=it+1; if(m<1e-11) break;
    }
    S.point(n[0],n[1],n[2],res.x); res.n[0]=n[0];res.n[1]=n[1];res.n[2]=n[2];
    res.h=res.x[0]*u[0]+res.x[1]*u[1]+res.x[2]*u[2]; return res;
  };
  // contact-point Jacobian J = dx/du (3x3, row-major, acts on tangent perturbations of u), central differences
  S.jac=function(u,guess,J){ const t1=[0,0,0],t2=[0,0,0]; basis(u,t1,t2); const e=3e-4, r1={h:0,x:[0,0,0],n:[0,0,0]}, r2={h:0,x:[0,0,0],n:[0,0,0]}; const up=[0,0,0],um=[0,0,0]; const cols=[];
    for(const t of [t1,t2]){ for(let k=0;k<3;k++){ up[k]=u[k]+e*t[k]; um[k]=u[k]-e*t[k]; } norm(up); norm(um);
      S.support(up,guess,r1); S.support(um,guess,r2); const ang=Math.acos(Math.max(-1,Math.min(1,up[0]*um[0]+up[1]*um[1]+up[2]*um[2])));
      cols.push([(r1.x[0]-r2.x[0])/ang,(r1.x[1]-r2.x[1])/ang,(r1.x[2]-r2.x[2])/ang]); }
    // J = sum_k col_k t_k^T  (zero on the radial direction u)
    for(let i=0;i<3;i++) for(let j=0;j<3;j++) J[3*i+j]=cols[0][i]*t1[j]+cols[1][i]*t2[j]; return J; };
}
function norm(v){ const l=1/Math.hypot(v[0],v[1],v[2]); v[0]*=l;v[1]*=l;v[2]*=l; }
function basis(n,e1,e2){ // orthonormal tangent basis at unit n
  let ax=Math.abs(n[0])<0.8?[1,0,0]:[0,1,0];
  let d=ax[0]*n[0]+ax[1]*n[1]+ax[2]*n[2]; e1[0]=ax[0]-d*n[0]; e1[1]=ax[1]-d*n[1]; e1[2]=ax[2]-d*n[2]; norm(e1);
  e2[0]=n[1]*e1[2]-n[2]*e1[1]; e2[1]=n[2]*e1[0]-n[0]*e1[2]; e2[2]=n[0]*e1[1]-n[1]*e1[0]; }
function gaussLegendre(n){ const nodes=new Array(n), weights=new Array(n);
  for(let i=0;i<n;i++){ let x=Math.cos(PI*(i+.75)/(n+.5)), pp; for(let it=0;it<100;it++){ let p0=1,p1=x; for(let k=2;k<=n;k++){ const p2=((2*k-1)*x*p1-(k-1)*p0)/k; p0=p1;p1=p2; } pp=n*(x*p1-p0)/(x*x-1); const dx=p1/pp; x-=dx; if(Math.abs(dx)<1e-15) break; }
    nodes[i]=x; weights[i]=2/((1-x*x)*pp*pp); } return {nodes,weights}; }

// ---------- rolling-body dynamics (world frame, z up, plane z=0, unit mass) ----------
// state: q=[w,x,y,z] (body->world), om=[3] world angular velocity, g=[x,y] CoM horizontal position. The contact point is where
// the body's outward normal is -z: n_b = R^T(-z); contact vector from CoM p = R x_b(n_b); CoM height = h(n_b); v_G = p x om (no slip).
function qrot(q,v,o){ const w=q[0],x=q[1],y=q[2],z=q[3]; // v rotated by q
  const tx=2*(y*v[2]-z*v[1]), ty=2*(z*v[0]-x*v[2]), tz=2*(x*v[1]-y*v[0]);
  o[0]=v[0]+w*tx+(y*tz-z*ty); o[1]=v[1]+w*ty+(z*tx-x*tz); o[2]=v[2]+w*tz+(x*ty-y*tx); return o; }
function qconjrot(q,v,o){ return qrot([q[0],-q[1],-q[2],-q[3]],v,o); }
function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function matvec(M,v){ return [M[0]*v[0]+M[1]*v[1]+M[2]*v[2],M[3]*v[0]+M[4]*v[1]+M[5]*v[2],M[6]*v[0]+M[7]*v[1]+M[8]*v[2]]; }
function solve3(A,b){ const [a,bb,c,d,e,f,g,h,i]=A; const det=a*(e*i-f*h)-bb*(d*i-f*g)+c*(d*h-e*g);
  return [ (b[0]*(e*i-f*h)-bb*(b[1]*i-f*b[2])+c*(b[1]*h-e*b[2]))/det, (a*(b[1]*i-f*b[2])-b[0]*(d*i-f*g)+c*(d*b[2]-b[1]*g))/det, (a*(e*b[2]-b[1]*h)-bb*(d*b[2]-b[1]*g)+b[0]*(d*h-e*g))/det ]; }
function Body(shape,opt){
  opt=opt||{}; const B=this; B.S=shape; B.g=opt.g||9.81; B.damp=opt.damp!=null?opt.damp:0.35; B.dampQ=opt.dampQ||0; // rolling dissipation: torque = -damp*Iavg*om  (1/s)
  B.q=[1,0,0,0]; B.om=[0,0,0]; B.pos=[0,0]; B.t=0; B.guess=null; B.rs={h:0,x:[0,0,0],n:[0,0,0]}; B.J=[0,0,0,0,0,0,0,0,0]; B.minN=1e9; B.Fz=0;
  B.Ib=shape.I; B.m=1;
  const nb=[0,0,0], pw=[0,0,0];
  // derivative at (q,om): returns {dq, dom, vG, h, p, Fz}
  B.deriv=function(q,om){
    const S=B.S; const nw=[0,0,-1]; qconjrot(q,nw,nb); // n_b
    S.support(nb,B.guess,B.rs); B.guess=B.rs.n.slice(); S.jac(nb,B.guess,B.J);
    const xb=B.rs.x, h=B.rs.h; const p=qrot(q,xb,[0,0,0]);
    // R J R^T (omega x n_w)
    const onw=cross(om,nw); const t1=qconjrot(q,onw,[0,0,0]); const t2=matvec(B.J,t1); const t3=qrot(q,t2,[0,0,0]);
    const omp=cross(om,p); const pd=[omp[0]-t3[0],omp[1]-t3[1],omp[2]-t3[2]];
    // inertia in world: Iw = R Ib R^T ; apply via rotating basis vectors
    const Iw=new Array(9); { const cols=[]; for(let k=0;k<3;k++){ const e=[0,0,0]; e[k]=1; const a=qconjrot(q,e,[0,0,0]); const b=matvec(B.Ib,a); cols.push(qrot(q,b,[0,0,0])); } for(let i=0;i<3;i++) for(let j=0;j<3;j++) Iw[3*i+j]=cols[j][i]; }
    const m=B.m, pp=p[0]*p[0]+p[1]*p[1]+p[2]*p[2];
    const A=[Iw[0]+m*(pp-p[0]*p[0]),Iw[1]-m*p[0]*p[1],Iw[2]-m*p[0]*p[2], Iw[3]-m*p[1]*p[0],Iw[4]+m*(pp-p[1]*p[1]),Iw[5]-m*p[1]*p[2], Iw[6]-m*p[2]*p[0],Iw[7]-m*p[2]*p[1],Iw[8]+m*(pp-p[2]*p[2])];
    const Iom=matvec(Iw,om), wIw=cross(om,Iom), pdw=cross(pd,om), ppdw=cross(p,pdw), pxg=cross(p,[0,0,-B.g*m]);
    const dm=B.damp+B.dampQ*Math.hypot(om[0],om[1],om[2]); const rhs=[-wIw[0]+m*ppdw[0]-pxg[0]-dm*B.S.Iavg*om[0], -wIw[1]+m*ppdw[1]-pxg[1]-dm*B.S.Iavg*om[1], -wIw[2]+m*ppdw[2]-pxg[2]-dm*B.S.Iavg*om[2]];
    const al=solve3(A,rhs); const pxa=cross(p,al);
    const F=[m*(pdw[0]+pxa[0]), m*(pdw[1]+pxa[1]), m*(pdw[2]+pxa[2]+B.g)]; // contact force (F = m(a_G - g))
    const vG=cross(p,om);
    const dq=[0.5*(-q[1]*om[0]-q[2]*om[1]-q[3]*om[2]), 0.5*(q[0]*om[0]+q[2]*om[2]-q[3]*om[1]), 0.5*(q[0]*om[1]-q[1]*om[2]+q[3]*om[0]), 0.5*(q[0]*om[2]+q[1]*om[1]-q[2]*om[0])];
    // dq = 0.5 * (0,om) * q : recompute exactly
    const wq=[0,om[0],om[1],om[2]]; const dq2=[0.5*(wq[0]*q[0]-wq[1]*q[1]-wq[2]*q[2]-wq[3]*q[3]),0.5*(wq[0]*q[1]+wq[1]*q[0]+wq[2]*q[3]-wq[3]*q[2]),0.5*(wq[0]*q[2]-wq[1]*q[3]+wq[2]*q[0]+wq[3]*q[1]),0.5*(wq[0]*q[3]+wq[1]*q[2]-wq[2]*q[1]+wq[3]*q[0])];
    return {dq:dq2,dom:al,vG,h,p,F,nb:nb.slice()};
  };
  B.step=function(dt){
    const q=B.q, om=B.om, add=(a,b,s)=>a.map((v,i)=>v+s*b[i]);
    const k1=B.deriv(q,om);
    const q2=nq(add(q,k1.dq,dt/2)), o2=add(om,k1.dom,dt/2); const k2=B.deriv(q2,o2);
    const q3=nq(add(q,k2.dq,dt/2)), o3=add(om,k2.dom,dt/2); const k3=B.deriv(q3,o3);
    const q4=nq(add(q,k3.dq,dt)), o4=add(om,k3.dom,dt); const k4=B.deriv(q4,o4);
    for(let i=0;i<4;i++) B.q[i]=q[i]+dt/6*(k1.dq[i]+2*k2.dq[i]+2*k3.dq[i]+k4.dq[i]);
    for(let i=0;i<3;i++) B.om[i]=om[i]+dt/6*(k1.dom[i]+2*k2.dom[i]+2*k3.dom[i]+k4.dom[i]);
    B.pos[0]+=dt/6*(k1.vG[0]+2*k2.vG[0]+2*k3.vG[0]+k4.vG[0]); B.pos[1]+=dt/6*(k1.vG[1]+2*k2.vG[1]+2*k3.vG[1]+k4.vG[1]);
    B.q=nq(B.q); B.t+=dt; if(k1.F[2]<B.minN) B.minN=k1.F[2]; B.Fz=k1.F[2];
  };
  function nq(q){ const l=1/Math.hypot(q[0],q[1],q[2],q[3]); return [q[0]*l,q[1]*l,q[2]*l,q[3]*l]; }
  // diagnostics at the current state
  B.info=function(){ const k=B.deriv(B.q,B.om); const Iw=null; const Iom=(function(){ const a=qconjrot(B.q,B.om,[0,0,0]); return matvec(B.Ib,a); })(); const ob=qconjrot(B.q,B.om,[0,0,0]);
    const KErot=0.5*(ob[0]*Iom[0]+ob[1]*Iom[1]+ob[2]*Iom[2]); const KEtr=0.5*B.m*(k.vG[0]**2+k.vG[1]**2+k.vG[2]**2);
    return {h:k.h,nb:k.nb,vG:k.vG,E:KErot+KEtr+B.m*B.g*k.h,p:k.p,Fz:k.F[2],ke:KErot+KEtr}; };
  // place with body-frame direction nBody pointing straight down (contact there), with extra rotation about vertical
  B.placeDown=function(nBody,yaw){ const nw=[0,0,-1]; const a=nBody; let ax=cross(a,nw); const s=Math.hypot(ax[0],ax[1],ax[2]), c=a[0]*nw[0]+a[1]*nw[1]+a[2]*nw[2];
    let q; if(s<1e-12){ q=c>0?[1,0,0,0]:[0,1,0,0]; } else { const ang=Math.atan2(s,c); const sh=Math.sin(ang/2)/s; q=[Math.cos(ang/2),ax[0]*sh,ax[1]*sh,ax[2]*sh]; }
    const yq=[Math.cos((yaw||0)/2),0,0,Math.sin((yaw||0)/2)]; q=qmul(yq,q); B.q=q; B.guess=null; };
  B.setRollingVelocity=function(v){ // horizontal CoM velocity v=[vx,vy] plus optional vertical spin
    const k=B.deriv(B.q,[0,0,0]); const h=k.h; B.om=[-v[1]/h,v[0]/h,0]; };
}
function qmul(a,b){ return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]; }
return {Shape,Body,qrot,qconjrot,qmul,norm,basis,cross,matvec};
})();
