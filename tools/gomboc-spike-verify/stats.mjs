import fs from 'fs';
const sets={}; for(const f of process.argv.slice(2)){ const j=JSON.parse(fs.readFileSync(f,'utf8')); const k=j.beta+' '+j.mode+' damp='+j.damp+' Q='+j.dampQ; (sets[k]=sets[k]||[]).push(...j.res); }
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length, sd=a=>Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
for(const [k,r] of Object.entries(sets)){ const t=r.filter(x=>x.tRest!=null).map(x=>x.tRest), d1=r.map(x=>x.d1*57.2958), d2=r.map(x=>x.d2*57.2958), tu=r.map(x=>x.turns);
 console.log(k,'n=',r.length,'rested',t.length,'| time to rest mean',mean(t).toFixed(1),'sd',sd(t).toFixed(1),'min',Math.min(...t).toFixed(1),'max',Math.max(...t).toFixed(1),
 '| angle@rest deg mean',mean(d1).toFixed(2),'max',Math.max(...d1).toFixed(2),'| angle +30s later mean',mean(d2).toFixed(3),'max',Math.max(...d2).toFixed(3),'| swings mean',mean(tu).toFixed(0),'min',Math.min(...tu),'max',Math.max(...tu),'| minFz',Math.min(...r.map(x=>x.minFz)).toFixed(0)); }
