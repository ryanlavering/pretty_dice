// Find the smallest centre-of-mass shift (body frame) that makes a bistable convex body mono-monostatic.   node find-nudge.mjs shape.json out.json [--radius 0.045] [--step 0.005] [--refine 0.0025]
// coarse grid search of M inside a ball (winding index of the cached support points), then a finer local grid around the best point; reports P*, |P*| in percent of the mean radius, |M| and the CoM counts.
import fs from 'fs'; import vm from 'vm'; import {smoothSampler,ballSearch,summarise} from './cm-tolerance.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const a=process.argv.slice(2); const get=(k,d)=>{ const i=a.indexOf(k); return i>=0?+a[i+1]:d; };
const sj=JSON.parse(fs.readFileSync(a[0],'utf8')); const S=new G.Shape({c:sj.c,Lmax:sj.Lmax}); const sm=smoothSampler(S,4,5); const mr=sm.meanR; const bad=P=>{ const c=sm.count(P); return Math.abs(c.plus-2)+c.minus; };
const base=sm.count([0,0,0]); const R=get('--radius',0.045)*mr, st=get('--step',0.005)*mr; const res=ballSearch(bad,R,st); const sum=summarise(res.M,mr);
let best=res.M.length?res.M.reduce((b,p)=>Math.hypot(...p)<Math.hypot(...b)?p:b,res.M[0]):null; let fine=null;
if(best){ const fs2=get('--refine',0.0025)*mr; const n=2; const M2=[]; for(let i=-n;i<=n;i++) for(let j=-n;j<=n;j++) for(let k=-n;k<=n;k++){ const P=[best[0]+i*fs2,best[1]+j*fs2,best[2]+k*fs2]; if(bad(P)===0) M2.push(P); } fine=M2.length?M2.reduce((b,p)=>Math.hypot(...p)<Math.hypot(...b)?p:b,M2[0]):best; }
const o={meanRadius:mr,countsAtCoM:base,coarseM:sum,bestShift:fine,bestShiftPercent:fine?+(100*Math.hypot(...fine)/mr).toFixed(3):null,bestShiftDirection:fine?fine.map(x=>+(x/Math.hypot(...fine)).toFixed(4)):null};
console.log(JSON.stringify(o)); if(a[1]&&!a[1].startsWith('--')) fs.writeFileSync(a[1],JSON.stringify(o));
