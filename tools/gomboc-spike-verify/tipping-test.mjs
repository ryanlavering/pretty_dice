// Check the tipping-graph sinks against the exact stable-face count of poly-equilibria.mjs on cube, tetrahedron, Fibonacci hulls and (optionally) a mesh.
import fs from 'fs'; import vm from 'vm'; import {polyEquilibria,fibonacciMesh,cube,tetra} from './poly-equilibria.mjs'; import {tippingGraph,tippingFitness} from './tipping-graph.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const row=(name,V)=>{ const r=polyEquilibria(V); for(const policy of ['steepest','worst']){ const g=tippingGraph(V,{policy}); console.log(`${name} [${policy}]: S(exact)=${r.S} U=${r.U} H=${r.H} F=${r.F} | tipping sinks=${g.sinks.length} ${g.sinks.length===r.S?'OK':'MISMATCH'}, faces ending in a non-lowest sink or cycle=${g.terminal.filter(t=>t!==g.sinks.map(s=>[s,g.faces[s].d]).sort((a,b)=>a[1]-b[1])[0][0]).length}, cyclic faces=${g.cycles}, tipping steps that do not lower the CoM=${g.nonDescending}, fitness=${tippingFitness(g).toFixed(2)}`); } };
row('cube',cube()); row('tetrahedron',tetra());
const S1=new G.Shape(0.03); for(const N of [30,100,200]) row('Sloan0.03 fib N='+N,fibonacciMesh(S1.r,N));
const P=JSON.parse(fs.readFileSync(new URL('./pronounced-shape.json',import.meta.url),'utf8')); const S2=new G.Shape({c:P.c,Lmax:P.Lmax}); for(const N of [100]) row('pronounced fib N='+N,fibonacciMesh(S2.r,N));
