"""node-free float stage: sequential LP for S=U=1. usage: python3 r15_run2.py dump.json mode(weighted|hom) R out.json [iters]"""
import sys,json,numpy as np,time; sys.path.insert(0,'.')
from r15_lp import *; from r15_run1 import start
def pick(B,d,c,free=None):
    H=B.Hv(d,c); L=B.lam(d,c); X=B.verts(d)
    st=[j for j in range(B.nf) if all(H[k]>=B.cos[j,k]*H[j] for k in B.nbr[j])]
    sink=min(st,key=lambda j:H[j]) if st else int(np.argmax(H))  # keep an existing stable face; else the one with max foot margin
    if not st:
        mg=[min(H[k]-B.cos[j,k]*H[j] for k in B.nbr[j]) for j in range(B.nf)]; sink=int(np.argmax(mg))
    tip={}
    for j in range(B.nf):
        if j==sink: continue
        tip[j]=min(B.nbr[j],key=lambda k:H[k]-B.cos[j,k]*H[j])
    dist=np.linalg.norm(X-c,axis=1); fv=int(np.argmax(dist)) if free is None else free
    av={ti:int(np.argmin(L[ti])) for ti in range(len(B.tri)) if ti!=fv}
    return tip,sink,av,fv
if __name__=='__main__':
    name,mode,R,outf=sys.argv[1],sys.argv[2],float(sys.argv[3]),sys.argv[4]; iters=int(sys.argv[5]) if len(sys.argv)>5 else 30; eps=float(sys.argv[6]) if len(sys.argv)>6 else 2e-3; tS=float(sys.argv[7]) if len(sys.argv)>7 else 2e-3
    n,d,c,T,P=start(name); B=Body(n,tri=dual_tri(n,T,P)); c0=c.copy(); best=None
    for it in range(iters):
        tip,sink,av,fv=pick(B,d,c)
        if mode=='hom':
            cc,_=centroid(B,d); J=jac(B,d); res=linprog_wrap=build_lp(B,tip,sink,av,fv,R,eps,hom=(cc,J),trust=0.15/(1+it*0.3),d0=d,tS=tS,cfix=c0)
        else: res=build_lp(B,tip,sink,av,fv,R,eps,tS=tS,cfix=c0)
        if res.status!=0: print('it',it,'LP status',res.status,res.message[:60]); break
        z=res.x; d,c,t=z[:B.nf],z[B.nf:B.nf+3],z[-1]
        st,pk,asp=B.stats(d,c); cc=centroid(B,d)[0]; 
        print('it',it,'t=%.5f'%t,'stable',st,'peaks',len(pk),'asp %.3f'%asp,'type %.1e'%B.typeok(d),'|c-cent|=%.4f'%np.linalg.norm(c-cc),flush=True)
        if len(st)==1 and len(pk)==1 and B.typeok(d)>0: best=(d.copy(),c.copy(),np.linalg.norm(c-cc))
        if best and t>0 and mode=='weighted': break
    if best: json.dump({'n':B.n.tolist(),'d':best[0].tolist(),'c':best[1].tolist(),'tri':B.tri,'shift':best[2]},open(outf,'w')); print('saved',outf)
