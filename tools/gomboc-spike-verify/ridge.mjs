import fs from 'fs'; import {icosphere} from './verify.mjs'; import {flat,minConv,critIndex,B} from './opt.mjs';
const base=JSON.parse(fs.readFileSync('shape2.json','utf8')); const ico3=icosphere(3), ico4=icosphere(4);
const idx=(l,m,t)=>B.terms.findIndex(x=>x.l===l&&x.m===m&&x.type===t);
const sets={ 'l3m3':[[3,3,'c']], 'l3m3+l6m3':[[3,3,'c'],[6,3,'c']], 'l4m4':[[4,4,'c']], 'l2m2':[[2,2,'c']] };
for(const [name,list] of Object.entries(sets)) for(const a of [0.01,0.02,0.04,0.08]){ const c=Float64Array.from(base.c); for(const [l,m,t] of list) c[idx(l,m,t)]+=a;
  const fl=flat(c,ico4.V), mc=minConv(c,ico4.V); const ci=mc>-0.5?critIndex(c,ico4,4):{plus:'-',minus:'-'};
  console.log(name,'amp',a,'flat',fl.toFixed(4),'minConv',mc.toFixed(3),'crit +/-',ci.plus,ci.minus); }
