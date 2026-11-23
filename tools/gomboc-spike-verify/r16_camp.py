import sys,numpy as np,time,json; from r16_lib2 import *
from scipy.spatial import ConvexHull
import os
KK=float(os.environ.get('KK','1')); KX=float(os.environ.get('KX','1'))
def seed(N,dl,jit,rs):
    P=fib(N)*np.array([KX,1,KK]); h=ConvexHull(P); n=h.equations[:,:3]; d=-h.equations[:,3]; c=np.array([0,0,dl])
    H=d-n@c; rng=np.random.default_rng(rs); n=n+rng.normal(0,jit,n.shape); return n/np.linalg.norm(n,axis=1)[:,None],H
# usage: r16_camp.py N dl A tmax_feas tmax_shrink lam [homog]
N=int(sys.argv[1]); dl=float(sys.argv[2]); A=float(sys.argv[3]); t1=float(sys.argv[4]); t2=float(sys.argv[5]); lam=float(sys.argv[6]); tag=sys.argv[7] if len(sys.argv)>7 else 'w'
RS=int(sys.argv[8]) if len(sys.argv)>8 else 0
t0=time.time(); st=None
for rs in range(RS,RS+6):
    n,H=seed(N,dl,0.01,rs); st,h1=run2(n,H,A,iters=2000,tmax=t1,verbose=False)
    if st is not None: break
if st is None: print('FAIL seed',N,dl,A); sys.exit()
S,U=st.counts(); ss=shape_stats(st.n,st.H,Topo(st)); rec=dict(N=N,dl=dl,A=A,stage1=dict(S=S,U=U,F=st.F,shift=ss['shift'],asp=ss['aspect_g'],merit=h1[-1][2],its=len(h1)),hist1=[h[:8] for h in h1[::5]])
h2=[]
if (S,U)==(1,1) and t2>0:
    st2,h2=run2(st.n,st.H,A,iters=5000,tmax=t2,lam_sh=lam,verbose=False)
    S2,U2=st2.counts(); ss2=shape_stats(st2.n,st2.H,Topo(st2)); rec['stage2']=dict(S=S2,U=U2,F=st2.F,shift=ss2['shift'],asp=ss2['aspect_g'],merit=h2[-1][2],its=len(h2)); rec['hist2']=[h[:8] for h in h2[::5]]; st=st2
rec['n']=st.n.tolist(); rec['H']=st.H.tolist(); rec['time']=time.time()-t0
json.dump(rec,open(f'runs/r16/camp_{tag}{KK}_N{N}_d{dl}_A{A}_r{RS}.json','w'))
print(tag,N,dl,A,'stage1',rec['stage1']['S'],rec['stage1']['U'],'%.3f'%rec['stage1']['shift'],'stage2',rec.get('stage2',{}).get('U'),'%.3f'%rec.get('stage2',{}).get('shift',-1),'F',st.F,'%.0fs'%rec['time'],flush=True)
