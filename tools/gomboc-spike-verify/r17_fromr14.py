import sys,json,os; sys.path.insert(0,'.')
from r17_lib import *
# usage: r17_fromr14.py dump.json A tmax tag jit mode(fixed0|homotopy)   (dump from r15-dump.mjs of a r14 body; c = homogeneous centroid)
f,A,tmax,tag,jit,mode=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),sys.argv[4],float(sys.argv[5]),sys.argv[6]
d=json.load(open(f)); P=np.array(d['P'])/d['scale']; T=np.array(d['T']); c=np.array(d['c'])/d['scale']
N=np.cross(P[T[:,1]]-P[T[:,0]],P[T[:,2]]-P[T[:,0]]); N/=np.linalg.norm(N,axis=1)[:,None]; dd=np.einsum('ij,ij->i',N,P[T[:,0]]); H=dd-N@c
rng=np.random.default_rng(1); n=N+rng.normal(0,jit,N.shape); n/=np.linalg.norm(n,axis=1)[:,None]
mv=float(os.environ.get('MV','0.005')); kw=dict(mv=mv,mt=mv)
st0=State(n,H/H.min()); print(tag,'seed',info(st0),flush=True)
st,h,inf=run3(n,H/H.min(),A,mode=mode,tmax=tmax,kw=kw,max_ins=int(os.environ.get('INS','0')))
i=info(st); hh=h[::max(1,len(h)//15)]
print(tag,'final',i,'best',bool(inf['best']),'its',len(h),'t %.0f'%inf['time'],'trace',[(x[2],x[3]) for x in hh],flush=True)
save(st,f'runs/r17/r14seed_{tag}.json',dict(A=A,mv=mv,mode=mode,jit=jit,hist=[x[:6] for x in h[::10]]))
