import sys,numpy as np,time,json; from r16_lib2 import *
def seed(N,dl,jit,rs):
    P=fib(N); h=ConvexHull(P); n=h.equations[:,:3]; d=-h.equations[:,3]; c=np.array([0,0,dl])
    H=d-n@c; rng=np.random.default_rng(rs); n=n+rng.normal(0,jit,n.shape); return n/np.linalg.norm(n,axis=1)[:,None],H
if __name__=='__main__':
    N=int(sys.argv[1]); dl=float(sys.argv[2]); A=float(sys.argv[3]); its=int(sys.argv[4]); lam=float(sys.argv[5])
    n,H=seed(N,dl,0.01,0)
    st,h=run2(n,H,A,iters=its,tag=f'N{N}d{dl}A{A}',lam_sh=0.0,stop_merit=1e-9)
    print('feasible',st.counts(),h[-1][:4])
    st,h=run2(st.n,st.H,A,iters=its,tag='shrink',lam_sh=lam)
    print('FINAL',st.counts(),h[-1])
