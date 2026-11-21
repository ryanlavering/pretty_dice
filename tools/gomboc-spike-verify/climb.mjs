import fs from 'fs'; import {icosphere} from './verify.mjs'; import {fitSloan,flat,minConv,critIndex,Fof,B} from './opt.mjs';
const [seed0,budgetMin,mcMin,out]=[+process.argv[2],+process.argv[3],+process.argv[4]||0.05,process.argv[5]||`best_${process.argv[2]}.json`];
let s=seed0>>>0; const rnd=()=>{s=(s*1664525+1013904223)>>>0; return s/4294967296;}; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const ico3=icosphere(3), ico4=icosphere(4), ico5=icosphere(5); const N=B.N;
let c=process.env.START?Float64Array.from(JSON.parse(fs.readFileSync(process.env.START,'utf8')).c):fitSloan(0.03); let best=flat(c,ico4.V); let sig=0.004; const t0=Date.now(); let it=0,acc=0;
const deg=B.terms.map(t=>t.l);
while(Date.now()-t0<budgetMin*60000){ it++;
  const d=new Float64Array(N); const mode=rnd(); if(mode<0.15){ const f=1+0.02*rnd(); for(let i=0;i<N;i++) d[i]=c[i]*(f-1); } else { const k=1+Math.floor(rnd()*6); for(let q=0;q<k;q++){ const i=Math.floor(rnd()*N); d[i]+=gauss()*sig/Math.max(1,deg[i]-1)**0.5; } }
  const c2=c.map((v,i)=>v+d[i]); const fl=flat(c2,ico3.V); if(fl<=best+1e-6) { continue; }
  const mc=minConv(c2,ico3.V); if(mc<mcMin) continue;
  const ci=critIndex(c2,ico3,3); if(ci.plus!==2||ci.minus!==0) continue; const ci4b=critIndex(c2,ico4,4); if(ci4b.plus!==2||ci4b.minus!==0) continue; const ci5=critIndex(c2,ico5,4); if(ci5.plus!==2||ci5.minus!==0) continue;
  c=c2; best=fl; acc++; if(acc%5===0){ const mc4=minConv(c,ico4.V), ci4=critIndex(c,ico4,4); console.error(`it ${it} acc ${acc} flat ${best.toFixed(4)} minConv(L3) ${mc.toFixed(3)} L4 ${mc4.toFixed(3)} crit4 ${ci4.plus}/${ci4.minus}`); fs.writeFileSync(out,JSON.stringify({flat:best,c:Array.from(c),Lmax:+(process.env.LMAX||10)})); } }
fs.writeFileSync(out,JSON.stringify({flat:best,c:Array.from(c),Lmax:+(process.env.LMAX||10)})); console.error('done',it,acc,best);
