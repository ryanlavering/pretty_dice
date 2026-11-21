import fs from 'fs'; import vm from 'vm';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
export function icosphere(L){ const t=(1+Math.sqrt(5))/2; let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(x=>x/l)});
 let T=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 for(let l=0;l<L;l++){ const m=new Map(), nt=[]; const mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a; if(m.has(k)) return m.get(k); const v=V[a].map((x,i)=>x+V[b][i]); const l=Math.hypot(...v); V.push(v.map(x=>x/l)); m.set(k,V.length-1); return V.length-1;};
  for(const [a,b,c] of T){ const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a); nt.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]); } T=nt; }
 return {V,T}; }
export function morse(vals,V,T){ const n=V.length, nb=Array.from({length:n},()=>new Set()); for(const [a,b,c] of T){ nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
 const cnt={min:0,max:0,saddle:0,multi:0}, list={min:[],max:[],saddle:[]};
 for(let i=0;i<n;i++){ const u=V[i]; const e1=[0,0,0],e2=[0,0,0]; G.basis(u,e1,e2); const ring=[...nb[i]].map(j=>{const d=V[j].map((x,k)=>x-u[k]); return {j,a:Math.atan2(d[0]*e2[0]+d[1]*e2[1]+d[2]*e2[2],d[0]*e1[0]+d[1]*e1[1]+d[2]*e1[2])};}).sort((a,b)=>a.a-b.a);
  let ch=0; for(let k=0;k<ring.length;k++){ const a=vals[ring[k].j]>vals[i], b=vals[ring[(k+1)%ring.length].j]>vals[i]; if(a!==b) ch++; }
  if(ch===0){ if(vals[ring[0].j]>vals[i]){cnt.min++;list.min.push(i);} else {cnt.max++;list.max.push(i);} } else if(ch===2){} else { if(ch===4){cnt.saddle++;list.saddle.push(i);} else {cnt.multi++;cnt.saddle+=ch/2-1; list.saddle.push(i);} } }
 return {cnt,list}; }
export function landscape(S,V){ const h=new Float64Array(V.length); const r={h:0,x:[0,0,0],n:[0,0,0]}; let maxit=0; for(let i=0;i<V.length;i++){ S.support(V[i],null,r); h[i]=r.h; if(r.it>maxit) maxit=r.it; } return {h,maxit}; }
export function sph(u){ return {theta:((Math.atan2(u[1],u[0])*180/Math.PI)+360)%360, phi:Math.acos(u[2])*180/Math.PI}; }
if(process.argv[1].endsWith('verify.mjs')){
 const beta=+process.argv[2]||0.02, levels=(process.argv[3]||'3,4,5,6').split(',').map(Number);
 const S=(process.env.SHAPEFILE?new G.Shape(JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8'))):new G.Shape(beta));
 // radial extremes of the shape about CoM
 for(const L of levels){ const {V,T}=icosphere(L); const {h,maxit}=landscape(S,V); const {cnt,list}=morse(h,V,T);
  console.log(`beta=${beta} icosphere L=${L} (${V.length} verts): minima=${cnt.min} maxima=${cnt.max} saddles=${cnt.saddle} multi=${cnt.multi}  chi=min-saddle+max=${cnt.min-cnt.saddle+cnt.max} (newton maxit ${maxit})`);
  if(L===levels[levels.length-1]){ for(const k of ['min','max','saddle']) for(const i of list[k]) console.log(' ',k,'h=',h[i].toFixed(6),JSON.stringify(sph(V[i]))); }
 }
}
