"""MILP stage: python3 r15_run3.py dump.json R eps tS tlimit out.json"""
import sys,json,numpy as np; sys.path.insert(0,'.')
from r15_run2 import *
name=sys.argv[1]; R,eps,tS,tl=map(float,sys.argv[2:6]); outf=sys.argv[6]
n,d,c,T,P=start(name); B=Body(n,tri=dual_tri(n,T,P)); tip,sink,av,fv=pick(B,d,c)
res,vs=build_milp(B,tip,sink,fv,R,eps,tS,c,tlimit=tl)
print('status',res.status,res.message[:80])
if res.x is not None:
    z=res.x; dd=z[:B.nf]; t=z[B.nf+3]; st,pk,asp=B.stats(dd,c); print('t=%.5f'%t,'stable',st,'peaks',len(pk),'asp %.3f'%asp,'type %.1e'%B.typeok(dd),'|c-cent| %.4f'%np.linalg.norm(c-centroid(B,dd)[0]))
    json.dump({'n':B.n.tolist(),'d':dd.tolist(),'c':c.tolist(),'tri':B.tri,'t':t},open(outf,'w'))
