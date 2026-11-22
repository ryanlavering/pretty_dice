// Real spherical harmonics, degrees 2..Lmax (degree 0,1 excluded: degree 1 would move the centre of mass), orthonormal on the unit sphere.
const SH=(function(){
 function make(Lmax,lmin=2){ const terms=[]; for(let l=lmin;l<=Lmax;l++) for(let m=0;m<=l;m++){ let f=1; for(let k=l-m+1;k<=l+m;k++) f/=k; // (l-m)!/(l+m)!
   let nrm=Math.sqrt((2*l+1)/(4*Math.PI)*f)*(m>0?Math.SQRT2:1); terms.push({l,m,c:0,n:nrm,type:'c'}); if(m>0) terms.push({l,m,c:0,n:nrm,type:'s'}); }
  const N=terms.length; const Q=[]; for(let l=0;l<=Lmax;l++) Q.push(new Float64Array(l+1));
  const mc=new Float64Array(Lmax+1), ms=new Float64Array(Lmax+1);
  function eval(x,y,z,out){ // fills out[i] = Y_i(x,y,z)
    mc[0]=1; ms[0]=0; for(let m=1;m<=Lmax;m++){ mc[m]=mc[m-1]*x-ms[m-1]*y; ms[m]=ms[m-1]*x+mc[m-1]*y; }
    let df=1; for(let m=0;m<=Lmax;m++){ Q[m][m]=df; df*=(2*m+1); if(m+1<=Lmax) Q[m+1][m]=z*(2*m+1)*Q[m][m]; for(let l=m+2;l<=Lmax;l++) Q[l][m]=((2*l-1)*z*Q[l-1][m]-(l+m-1)*Q[l-2][m])/(l-m); }
    for(let i=0;i<N;i++){ const t=terms[i]; const q=Q[t.l][t.m]*t.n; out[i]=t.type==='c'?q*mc[t.m]:q*ms[t.m]; } }
  return {N,terms,eval,Lmax}; }
 return {make}; })();
