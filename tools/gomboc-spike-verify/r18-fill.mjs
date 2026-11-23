// Round 18 task 1: valley filling sweep. node r18-fill.mjs body.json out.json [nsteps]
import fs from 'fs'; import {evalPI} from './r14-lib.mjs'; import {pairs,fillPts,applyMove,aspectOf,stat,peakSet} from './r18-lib.mjs'; import {norm,sub} from './r14-lib.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const e0=evalPI(J.vertices.map(p=>p.map(BigInt))); const NS=+process.argv[4]||24;
const pr=pairs(e0); const base=stat(e0); const ps0=peakSet(e0); const rows=[]; const MODES=['foot','ends','footends','cap3','footPk','ramp1','ramp2','ramp3','chain'];
console.log('base',base,'aspect',aspectOf(e0).toFixed(3));
pr.forEach((p,ip)=>{ for(const mode of MODES){ let first=null,best=null; const trace=[]; for(let i=0;i<=NS;i++){ const phi=1.2*i/NS; const delta=phi*Math.max(p.barrier,1e-4*e0.rbar); const m=fillPts(e0,p,delta,mode); let e; try{ e=applyMove(e0,m);}catch(x){e=null;} if(!e||!e.valid){ continue; }
   const s=stat(e); const ps=peakSet(e); let newPk=0; for(const k of ps) if(!ps0.has(k)) newPk++; const lowGone=!ps.has(e0.PI[p.low].join(',')); const sh=norm(sub(e.c,e0.c))/e0.rbar; const asp=aspectOf(e);
   const rec={pair:ip,edge:p.edge,mode,phi,delta:delta/e0.rbar,...s,newPeaks:newPk,lowPeakGone:lowGone,shiftPct:100*sh,aspect:asp};
   trace.push([+phi.toFixed(3),s.S,s.U,s.H,s.F,newPk,lowGone?1:0,+(100*sh).toFixed(3)]); if(i===0) continue; const sc=(s.S-1)*1e4+s.U*100+s.H; if(!best||sc<best.sc||(sc===best.sc&&phi<best.rec.phi)) best={sc,rec}; if(!first&&s.S===1&&s.U<base.U) first=rec; }
  rows.push({pair:ip,edge:p.edge,peaks:p.peaks,low:p.low,barrierFrac:p.barrier/e0.rbar,mode,firstImprove:first,best:best&&best.rec,trace}); } });
fs.writeFileSync(process.argv[3],JSON.stringify({base,aspect:aspectOf(e0),pairs:pr.map(p=>({edge:p.edge,peaks:p.peaks,low:p.low,barrier:p.barrier/e0.rbar,hsFrac:p.hsFrac,sameChain:p.sameChain})),rows},null,1));
for(const r of rows) console.log(r.pair,JSON.stringify(r.edge),'barrier%',(100*r.barrierFrac).toFixed(2),r.mode,'first',r.firstImprove&&[r.firstImprove.phi.toFixed(2),r.firstImprove.S,r.firstImprove.U,r.firstImprove.H],'best',r.best&&[r.best.phi.toFixed(2),r.best.S,r.best.U,r.best.H,r.best.F]);
