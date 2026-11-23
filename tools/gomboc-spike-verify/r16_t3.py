import sys,numpy as np,time; from r16_lib import *
from scipy.spatial import ConvexHull
def seed(N,dl,jit,rs):
    P=fib(N); h=ConvexHull(P); n=h.equations[:,:3]; d=-h.equations[:,3]; c=np.array([0,0,dl])
    H=d-n@c; rng=np.random.default_rng(rs)
    n=n+rng.normal(0,jit,n.shape); return n/np.linalg.norm(n,axis=1)[:,None],H
N=int(sys.argv[1]); dl=float(sys.argv[2]); A=float(sys.argv[3]); its=int(sys.argv[4])
n,H=seed(N,dl,0.01,0)
st,h=run(n,H,A,iters=its,tag=f'N{N}d{dl}A{A}',verbose=True)
if st is not None: print('FINAL',st.counts(),st.F,'asp %.2f'%st.aspect())
