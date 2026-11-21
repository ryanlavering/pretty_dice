import fs from 'fs'; import vm from 'vm'; import {hull,fib,centroid,stableFaces} from './hull.mjs';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc'); const S=new G.Shape(+process.argv[2]||0.03);
for(const N of [100,200,500,1000,2000]){ let P=fib(N).map(u=>S.point(u[0],u[1],u[2],[0,0,0])); let faces=hull(P); const c=centroid(P,faces); P=P.map(p=>[p[0]-c[0],p[1]-c[1],p[2]-c[2]]); faces=hull(P);
 const st=stableFaces(P,faces); console.log(`N=${N}: hull faces=${faces.length}, hull CoM offset=${Math.hypot(...c).toExponential(2)}, statically stable triangular facets=${st.cnt} (${(100*st.cnt/faces.length).toFixed(0)}% of facets)`); }
