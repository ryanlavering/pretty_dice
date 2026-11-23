import sys,json,numpy as np; sys.path.insert(0,'.')
from r15_lp import *
from r15_gate import planes
S='/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/'
def start(name):
    D=json.load(open(S+name)); P=np.array(D['P'])/D['scale']; T=D['T']; c0=np.array(D['c'])/D['scale']
    n,d=planes(P,T); sc=1.0/ (d-n@c0).min(); return n,d*sc,c0*sc,T,P
if __name__=='__main__':
    n,d,c,T,P=start(sys.argv[1]); tri=dual_tri(n,T,P); B=Body(n,tri=tri)
    print('faces',B.nf,'dual tris',len(B.tri),'type worst',B.typeok(d),'rho',B.rho)
    st,pk,asp=B.stats(d,c); print('stable',st,'peaks',len(pk),'aspect',asp)
    print('centroid check',centroid(B,d)[0],c)
