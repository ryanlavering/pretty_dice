// node dedupe.mjs params.json  -> {dist,id,dup} (dup when RMS radius distance to a catalogued or reference body < 2 percent)
import {signature,nearest,readJSON} from './lib.mjs';
const q=readJSON(process.argv[2]).params||readJSON(process.argv[2]); const s=signature(q); const n=nearest(s); console.log(JSON.stringify({dist:+n.dist.toFixed(5),id:n.id,dup:n.dist<0.003,ratio:s.ratio}));
