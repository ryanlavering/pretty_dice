// Equilibria of the Fibonacci-sampled hulls of the gomboc surfaces (feeds the "Low-poly search log" in docs/design/gomboc-spike.md)
import fs from 'fs'; import vm from 'vm'; import {polyEquilibria,fibonacciMesh} from './poly-equilibria.mjs';
const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
const specs={sloan003:0.03,pronounced:JSON.parse(fs.readFileSync(new URL('./pronounced-shape.json',import.meta.url),'utf8'))};
for(const [name,spec] of Object.entries(specs)){ const S=new G.Shape(spec.c?{c:spec.c,Lmax:spec.Lmax}:spec); for(const N of (process.argv[2]||'50,100,200,500').split(',').map(Number)){ const r=polyEquilibria(fibonacciMesh(S.r,N)); console.log(`${name} fib N=${N}: V=${r.V} F=${r.F} E=${r.E} | stable S=${r.S} unstable U=${r.U} saddle H=${r.H} S+U-H=${r.poincareHopf}`); } }
