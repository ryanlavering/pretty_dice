import fs from 'fs'; import vm from 'vm';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
const [beta,n,seed,mode]=[+process.argv[2],+process.argv[3],+process.argv[4],process.argv[5]||'roll'];
const g=654,damp=+(process.argv[6]||0.6),dampQ=+(process.argv[7]||0),dt=1/(+process.env.HZ||120); const S=(process.env.SHAPEFILE?new G.Shape(JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8'))):new G.Shape(beta)); const SJ=process.env.SHAPEFILE?JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8')):{}; const stable=SJ.stable||[-1,0,0], unstable=SJ.unstable||[1,0,0];
let s=seed>>>0; const rnd=()=>{s=(s*1664525+1013904223)>>>0; return s/4294967296;}; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])));
const res=[];
for(let k=0;k<n;k++){ const B=new G.Body(S,{g,damp,dampQ}); let v=[gauss(),gauss(),gauss()]; G.norm(v);
 if(mode==='roll'){ B.placeDown(v,rnd()*6.28); const sp=3+11*rnd(); let d=[gauss(),gauss(),0]; G.norm(d); B.setRollingVelocity([d[0]*sp,d[1]*sp]); B.om[2]+=gauss()*2; }
 else { B.placeDown(unstable,0); const e=0.02*rnd()+0.005; let d=[gauss(),gauss(),0]; G.norm(d); B.setRollingVelocity([d[0]*e,d[1]*e]); }
 let rest=0,tRest=null,prev=null,dir=0,turns=0,maxFz=-1e9,t0wob=null; let i=0;
 for(;i<300/dt;i++){ B.step(dt); if(i%6===0){ const nb=G.qconjrot(B.q,[0,0,-1],[0,0,0]); const dd=ang(nb,stable); if(prev!==null){ const nd=dd>prev+1e-4?1:dd<prev-1e-4?-1:0; if(nd){ if(dir===1&&nd===-1&&prev>0.02) turns++; dir=nd; } } prev=dd;
   const w=Math.hypot(...B.om); if(w<0.05){ rest+=6*dt; if(rest>1.5){ tRest=B.t-1.5; break; } } else rest=0; } }
 const nb1=G.qconjrot(B.q,[0,0,-1],[0,0,0]); const d1=ang(nb1,stable);
 for(let j=0;j<30/dt;j++) B.step(dt); const nb2=G.qconjrot(B.q,[0,0,-1],[0,0,0]); const d2=ang(nb2,stable);
 res.push({tRest,d1,d2,turns,minFz:B.minN});
 console.error(mode,beta,k,tRest&&tRest.toFixed(1),(d1*57.3).toFixed(2),(d2*57.3).toFixed(2),turns);
}
console.log(JSON.stringify({beta:process.env.SHAPEFILE?'egg':beta,mode,seed,damp,dampQ,res}));
