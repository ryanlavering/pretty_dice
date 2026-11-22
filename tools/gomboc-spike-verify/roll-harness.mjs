// Behavioural harness for approximate bodies: random rolls with the CoM shifted by lambda * P*, then where does the body end?
//   node roll-harness.mjs shape.json nudge.json lambda nRolls seed out.json      (page defaults: g 654, resistance 2.0, step 1/180)
// Records for every roll the body-frame down normal at the end of the roll (rest detection |omega| < 0.05 for 1.5 s, then 30 s more), clusters the end directions (6 deg),
// reports shares, time to rest and swings. The most common cluster is the de-facto stable point.
import fs from 'fs'; import vm from 'vm';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const [shapeF,nudgeF,lambda,n,seed,outF]=[process.argv[2],process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6],process.argv[7]];
const sj=JSON.parse(fs.readFileSync(shapeF,'utf8')); const S=new G.Shape({c:sj.c,Lmax:sj.Lmax}); const P=nudgeF==='none'?[0,0,0]:JSON.parse(fs.readFileSync(nudgeF,'utf8')).bestShift; S.setNudge(P.map(x=>x*lambda));
const g=654,damp=2.0,dt=1/180; let s=seed>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const res=[]; for(let k=0;k<n;k++){ const B=new G.Body(S,{g,damp}); let v=[gauss(),gauss(),gauss()]; G.norm(v); B.placeDown(v,rnd()*6.28); const sp=3+11*rnd(); let d=[gauss(),gauss(),0]; G.norm(d); B.setRollingVelocity([d[0]*sp,d[1]*sp]); B.om[2]+=gauss()*2;
  let hold=0,tRest=null,hold2=0; for(let i=0;i<300/dt;i++){ B.step(dt); if(i%6===0){ const w=Math.hypot(...B.om); if(w<0.05){ hold+=6*dt; if(hold>1.5){ tRest=B.t-1.5; break; } } else hold=0; if(w<0.2){ hold2+=6*dt; if(hold2>6){ tRest=B.t-6; break; } } else hold2=0; } }
  for(let j=0;j<30/dt;j++) B.step(dt); const nb=G.qconjrot(B.q,[0,0,-1],[0,0,0]); res.push({tRest,nb,minFz:B.minN}); console.error(k,tRest&&tRest.toFixed(1),nb.map(x=>x.toFixed(3)).join(',')); }
const cl=[]; for(const r of res){ let f=cl.find(c=>Math.acos(Math.min(1,c.u[0]*r.nb[0]+c.u[1]*r.nb[1]+c.u[2]*r.nb[2]))<0.105); if(f){ f.n++; f.sum=f.sum.map((x,i)=>x+r.nb[i]); } else cl.push({u:r.nb.slice(),n:1,sum:r.nb.slice()}); } cl.sort((a,b)=>b.n-a.n); cl.forEach(c=>{ const l=Math.hypot(...c.sum); c.mean=c.sum.map(x=>x/l); });
const ts=res.filter(r=>r.tRest!=null).map(r=>r.tRest); const o={lambda,n,seed,shiftPercentOfRadius:+(100*Math.hypot(...P.map(x=>x*lambda))/1.0).toFixed(3),clusters:cl.map(c=>({share:+(c.n/n).toFixed(3),dir:c.mean.map(x=>+x.toFixed(4))})),meanTimeToRest:ts.length?+(ts.reduce((a,b)=>a+b,0)/ts.length).toFixed(1):null,rested:ts.length,minFz:Math.min(...res.map(r=>r.minFz))};
console.log(JSON.stringify(o)); if(outF) fs.writeFileSync(outF,JSON.stringify(o));
