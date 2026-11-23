"""Round 16 v2: SLP over (n,H), c = origin. Aspect measured about the (homogeneous) centroid g (frozen per LP step), optional centroid-shift objective
(weighted: minimise |g|/rbar) or homogeneous (penalise |g| strongly)."""
import numpy as np, json, time
from scipy.optimize import linprog
from scipy.sparse import csr_matrix, hstack, identity
from r16_lib import fib,frames,hull_tri,vertices,type_pairs,stable_mask,State,drop_redundant,apply
from scipy.spatial import ConvexHull

class Topo:
    def __init__(s,st):
        s.tri=st.tri; s.F=st.F
        mem=[[] for _ in range(st.F)]
        for t,tr in enumerate(st.tri):
            for f in tr: mem[f].append(t)
        s.mem=[np.array(m) for m in mem]
def centroid_fixed(n,H,topo,v=None):
    if v is None: v,_=vertices(n,H,topo.tri)
    e1,e2=frames(n); vol=0.; g=np.zeros(3)
    for i,m in enumerate(topo.mem):
        p=v[m]; ctr=p.mean(0); q=p-ctr
        ang=np.arctan2(q@e2[i],q@e1[i]); o=np.argsort(ang); p=p[o]
        a=p[0]; b=p[1:-1]; c=p[2:]
        w=np.abs(np.einsum('ij,ij->i',np.cross(b,c),np.broadcast_to(a,b.shape)))  # |det(a,b,c)|
        vol+=w.sum(); g+=(w[:,None]*(a+b+c)).sum(0)
    return g/(4*vol),vol/6
def shape_stats(n,H,topo):
    v,lam=vertices(n,H,topo.tri); g,vol=centroid_fixed(n,H,topo,v)
    rb=np.linalg.norm(v-g,axis=1).mean(); hg=(H-n@g).min(); rg=np.linalg.norm(v-g,axis=1).max()
    return dict(g=g,vol=vol,rbar=rb,shift=np.linalg.norm(g)/rb,aspect_g=rg/hg,aspect_c=np.linalg.norm(v,axis=1).max()/H.min(),hmin_g=hg)

class Cons2:
    def __init__(s,st,A,mv=0.02,mt=0.02,mty=2e-3,wty=10.,hc=0.03):
        s.A=A; n,H=st.n,st.H; F=st.F; s.tri=st.tri; s.tp=st.tp; s.topo=Topo(st)
        s.ss=shape_stats(n,H,s.topo); s.g0=s.ss['g']; s.h0=s.ss['hmin_g']; s.hc=hc*s.ss['rbar']
        nrm=np.linalg.norm(st.v,axis=1); s.peak=int(np.argmax(nrm)); s.sink=int(np.argmin(H))
        lam=st.lam; s.vi=np.array([t for t in range(st.V) if t!=s.peak]); s.vk=np.argmin(lam[s.vi],axis=1)
        s.vs=1./np.abs(lam[s.vi]).sum(axis=1)
        C=n@n.T; sin=np.sqrt(np.maximum(1-C*C,1e-12))
        T=(C*H[:,None]-H[None,:])/(sin*H[:,None]); np.fill_diagonal(T,-1e9)
        s.tj=np.array([j for j in range(F) if j!=s.sink]); s.tk=np.argmax(T[s.tj],axis=1)
        s.mv,s.mt,s.mty=mv,mt,mty; s.wty=wty
    def g(s,n,H):
        v,lam=vertices(n,H,s.tri)
        ty=H[s.tp[:,1]]-np.einsum('ij,ij->i',n[s.tp[:,1]],v[s.tp[:,0]])
        cl=-lam[s.vi,s.vk]*s.vs
        cj=np.einsum('ij,ij->i',n[s.tj],n[s.tk]); sin=np.sqrt(np.maximum(1-cj**2,1e-12))
        tip=(cj*H[s.tj]-H[s.tk])/(sin*H[s.tj])
        asp=(s.A*s.h0-np.linalg.norm(v-s.g0,axis=1))/s.h0
        hg=((H-n@s.g0)-s.h0)/s.h0
        hcin=(H-s.hc)/s.h0     # c strictly inside
        return np.concatenate([ty,cl,tip,asp,hg,hcin])
    def meta(s):
        nty,nv,nt,na,nh=len(s.tp),len(s.vi),len(s.tj),len(s.tri),len(s.topo.mem)
        m=np.concatenate([np.full(nty,s.mty),np.full(nv,s.mv),np.full(nt,s.mt),np.zeros(na),np.zeros(nh),np.zeros(nh)])
        w=np.concatenate([np.full(nty,s.wty),np.ones(nv),np.ones(nt),np.full(na,s.wty),np.full(nh,s.wty),np.full(nh,s.wty)])
        return m,w
    def shiftvec(s,n,H): g,_=centroid_fixed(n,H,s.topo); return g/s.ss['rbar']

def merit2(st,A,**kw):
    c=Cons2(st,A,**kw); g=c.g(st.n,st.H); m,w=c.meta()
    return float((w*np.maximum(0,m-g)).sum()),c,g,m,w

def step_lp2(st,c,g0,m,w,delta,lam_sh,fd=1e-6):
    n,H=st.n,st.H; F=st.F; e1,e2=frames(n); nv=3*F; G=len(g0); J=np.zeros((G,nv)); Js=np.zeros((3,nv)); s0=c.shiftvec(n,H)
    for i in range(F):
        for q,e in ((0,e1),(1,e2)):
            n2=n.copy(); nn=n[i]+fd*e[i]; n2[i]=nn/np.linalg.norm(nn)
            J[:,2*i+q]=(c.g(n2,H)-g0)/fd
            if lam_sh>0: Js[:,2*i+q]=(c.shiftvec(n2,H)-s0)/fd
        H2=H.copy(); H2[i]+=fd; J[:,2*F+i]=(c.g(n,H2)-g0)/fd
        if lam_sh>0: Js[:,2*F+i]=(c.shiftvec(n,H2)-s0)/fd
    # vars: dx(nv), s(G), tk(3) abs of shift components
    Aub=hstack([csr_matrix(-J),-identity(G,format='csr'),csr_matrix((G,3))]); bub=g0-m
    rows=[Aub]; rhs=[bub]
    if lam_sh>0:
        for sg in (1,-1):
            rows.append(hstack([csr_matrix(sg*Js),csr_matrix((3,G)),-identity(3,format='csr')])); rhs.append(-sg*s0)
    from scipy.sparse import vstack
    A_=vstack(rows,format='csr'); b_=np.concatenate(rhs)
    cost=np.concatenate([np.zeros(nv),w,np.full(3,lam_sh)])
    bnd=[(-delta,delta)]*nv+[(0,None)]*G+[(0,None)]*3
    r=linprog(cost,A_ub=A_,b_ub=b_,bounds=bnd,method='highs')
    if r.status!=0: return None
    return r.x[:nv],r.fun

def run2(n,H,A,iters=300,delta0=0.02,tag='',tmax=1e9,verbose=True,lam_sh=0.0,L=30.,homog=False,mv=0.02,mt=0.02,mty=2e-3,stop_merit=1e-9,every=10):
    """minimise Phi = L*merit + lam_sh*shift (shift=|g|/rbar). homog: lam_sh large pushes g -> 0."""
    t0=time.time(); n=n/np.linalg.norm(n,axis=1)[:,None]
    try: n,H=drop_redundant(n,H)
    except ValueError: return None,[]
    st=State(n,H); kw=dict(mv=mv,mt=mt,mty=mty)
    def phi_of(st):
        M,c,g,m,w=merit2(st,A,**kw); sh=c.ss['shift']; return L*M+lam_sh*sh,M,c,g,m,w,sh
    Ph,M0,c,g,m,w,sh=phi_of(st); delta=delta0; hist=[]
    for it in range(iters):
        if time.time()-t0>tmax: break
        wL=w*L
        r=step_lp2(st,c,g,m,wL,delta,lam_sh)
        if r is None: delta*=0.5
        else:
            dx,pred=r; nn,Hn=apply(st,dx)
            try:
                nn2,Hn2=drop_redundant(nn,Hn); st2=State(nn2,Hn2)
                if st2.bad>0 or (st2.lam is None): raise ValueError
                Ph1,M1,c1,g1,m1,w1,sh1=phi_of(st2)
                hs=c1.ss['hmin_g']; 
                if hs<=0 or not np.isfinite(Ph1): raise ValueError
            except Exception as ex:
                Ph1=1e18
            if Ph1<Ph-1e-10:
                # rescale so hmin_g=1
                sc=c1.ss['hmin_g']; st2=State(nn2,Hn2/sc); Ph,M0,c,g,m,w,sh=phi_of(st2); st=st2; delta=min(delta*1.3,0.1)
            else: delta*=0.5
        S,U=st.counts(); hist.append((it,Ph,M0,sh,S,U,st.F,delta))
        if verbose and (it%every==0): print(tag,it,'phi %.4f merit %.4f shift %.3f S %d U %d F %d asp_g %.2f delta %.4f t %.0f'%(Ph,M0,sh,S,U,st.F,c.ss['aspect_g'],delta,time.time()-t0),flush=True)
        if delta<1e-7: break
        if lam_sh==0 and M0<stop_merit: break
    return st,hist
