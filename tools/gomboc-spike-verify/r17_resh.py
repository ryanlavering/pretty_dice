import sys,json,os,time; sys.path.insert(0,'.')
from r17_lib import *
z=np.load('/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/controls-data/reshetov14_dyadic.npz',allow_pickle=False)
print(z.files); nm=z[z.files[0]]; of=z[z.files[1]]
l=np.linalg.norm(nm,axis=1); n=nm/l[:,None]; H=of/l
A=float(sys.argv[1]); jit=float(sys.argv[2]); rounds=int(sys.argv[3]); tm=float(sys.argv[4]); tag=sys.argv[5]
rng=np.random.default_rng(0); n=n+rng.normal(0,jit,n.shape); n/=np.linalg.norm(n,axis=1)[:,None]
st=State(n,H/H.min()); print('seed',info(st),flush=True)
kw=dict(mv=0.005,mt=0.005); best=None
for r in range(rounds):
    st,h,inf=run3(st.n,st.H,A,mode='fixed0',tmax=tm,kw=kw); i=info(st); print(tag,'round',r,i,'best',bool(inf['best']),flush=True)
    if inf['best']: best=st; break
    M,c,gg,m,w=merit2(st,A,**kw)
    try: n1,H1=insert_face(st,c,m,gg,depth=0.02); st=State(*drop_redundant(n1,H1))
    except Exception as e: print('insert fail',e); break
save(best if best is not None else st,f'runs/r17/resh_{tag}.json',dict(A=A,found=best is not None))
