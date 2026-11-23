"""Round 16: joint SLP over (unit normals n_i, heights H_i) with c at the origin (translation gauge removed).
Polytope P = {x : n_i.x <= H_i}. Dual hull of p_i = n_i/H_i gives the (simple) vertices. All constraints linearised, trust-region LP (scipy HiGHS), float.
Conditions (all about c = origin):
  stable face j  : n_k.(H_j n_j) < H_k for all k  -> sink = argmin H, every other face has a violated k (tips)
  peak vertex    : lam = M^-T v with v=M^-1 H_ijk, all lam > 0 -> every vertex except the farthest needs some lam_k < 0
  Poincare-Hopf: S+U-H=2 so S=U=1 forces H=0 (saddles not constrained separately).
  type : every other plane l strictly above the vertex (local: third faces of the 3 neighbour vertices)
  aspect : |v| <= A (heights >= 1)
"""
import numpy as np, json, time, sys
from scipy.spatial import ConvexHull
from scipy.optimize import linprog
from scipy.sparse import csr_matrix, hstack, identity

def fib(m):
    i=np.arange(m)+.5; z=1-2*i/m; r=np.sqrt(1-z*z); p=np.pi*(1+5**.5)*i; return np.c_[r*np.cos(p),r*np.sin(p),z]

def frames(n):
    a=np.where(np.abs(n[:,0:1])<0.9,np.array([[1.,0,0]]),np.array([[0,1.,0]]))
    e1=np.cross(n,a); e1/=np.linalg.norm(e1,axis=1)[:,None]; e2=np.cross(n,e1); return e1,e2

def hull_tri(n,H):
    p=n/H[:,None]
    h=ConvexHull(p,qhull_options='Qt')
    tri=np.sort(h.simplices,axis=1)
    used=np.zeros(len(n),bool); used[tri.ravel()]=True
    return tri,used

def vertices(n,H,tri):
    M=n[tri]; v=np.linalg.solve(M,H[tri][:,:,None])[:,:,0]
    lam=np.linalg.solve(M.transpose(0,2,1),v[:,:,None])[:,:,0]
    return v,lam

def type_pairs(tri):
    ed={}
    for t,(a,b,c) in enumerate(tri):
        for e in ((a,b),(a,c),(b,c)): ed.setdefault(e,[]).append(t)
    tp=[]; bad=0
    for e,ts in ed.items():
        if len(ts)!=2: bad+=1; continue
        t1,t2=ts
        l1=[x for x in tri[t1] if x not in e][0]; l2=[x for x in tri[t2] if x not in e][0]
        tp.append((t1,l2)); tp.append((t2,l1))
    return np.array(tp),bad

def stable_mask(n,H):
    C=n@n.T
    ok=(C*H[:,None]<H[None,:]-1e-12)
    np.fill_diagonal(ok,True)
    return ok.all(axis=1)

class State:
    def __init__(s,n,H):
        s.n=n; s.H=H; s.F=len(n)
        s.tri,used=hull_tri(n,H); s.redundant=np.where(~used)[0]
        s.v,s.lam=vertices(n,H,s.tri); s.V=len(s.tri)
        s.tp,s.bad=type_pairs(s.tri)
    def counts(s):
        return int(stable_mask(s.n,s.H).sum()), int((s.lam>0).all(axis=1).sum())
    def aspect(s): return np.linalg.norm(s.v,axis=1).max()/s.H.min()

class Cons:
    def __init__(s,st,A,mv=0.02,mt=0.02,mty=2e-3,wty=10.):
        s.A=A; n,H=st.n,st.H; F=st.F; s.tri=st.tri; s.tp=st.tp
        nrm=np.linalg.norm(st.v,axis=1); s.peak=int(np.argmax(nrm)); s.sink=int(np.argmin(H))
        lam=st.lam; s.vi=np.array([t for t in range(st.V) if t!=s.peak]); s.vk=np.argmin(lam[s.vi],axis=1)
        s.vs=1./np.abs(lam[s.vi]).sum(axis=1)
        C=n@n.T
        sin=np.sqrt(np.maximum(1-C*C,1e-12))
        T=(C*H[:,None]-H[None,:])/(sin*H[:,None]); np.fill_diagonal(T,-1e9)
        s.tj=np.array([j for j in range(F) if j!=s.sink]); s.tk=np.argmax(T[s.tj],axis=1)
        s.mv,s.mt,s.mty=mv,mt,mty; s.wty=wty
    def g(s,n,H):
        v,lam=vertices(n,H,s.tri)
        ty=H[s.tp[:,1]]-np.einsum('ij,ij->i',n[s.tp[:,1]],v[s.tp[:,0]])
        cl=-lam[s.vi,s.vk]*s.vs
        cj=np.einsum('ij,ij->i',n[s.tj],n[s.tk])
        sin=np.sqrt(np.maximum(1-cj**2,1e-12))
        tip=(cj*H[s.tj]-H[s.tk])/(sin*H[s.tj])
        asp=s.A-np.linalg.norm(v,axis=1)
        return np.concatenate([ty,cl,tip,asp,H-1.0])
    def meta(s,nty,nv,nt,na,nh):
        m=np.concatenate([np.full(nty,s.mty),np.full(nv,s.mv),np.full(nt,s.mt),np.zeros(na),np.zeros(nh)])
        w=np.concatenate([np.full(nty,s.wty),np.ones(nv),np.ones(nt),np.full(na,s.wty),np.full(nh,s.wty)])
        return m,w

def merit_state(st,A,mv=0.02,mt=0.02,mty=2e-3,wty=10.):
    c=Cons(st,A,mv,mt,mty,wty); g=c.g(st.n,st.H)
    m,w=c.meta(len(c.tp),len(c.vi),len(c.tj),st.V,st.F)
    return float((w*np.maximum(0,m-g)).sum()),c,g,m,w

def step_lp(st,c,g0,m,w,delta,fd=1e-6):
    n,H=st.n,st.H; F=st.F; e1,e2=frames(n)
    nv=3*F; G=len(g0); J=np.zeros((G,nv))
    for i in range(F):
        for q,e in ((0,e1),(1,e2)):
            n2=n.copy(); nn=n[i]+fd*e[i]; n2[i]=nn/np.linalg.norm(nn)
            J[:,2*i+q]=(c.g(n2,H)-g0)/fd
        H2=H.copy(); H2[i]+=fd; J[:,2*F+i]=(c.g(n,H2)-g0)/fd
    Aub=hstack([csr_matrix(-J),-identity(G,format='csr')]); bub=g0-m
    cost=np.concatenate([np.zeros(nv),w])
    b=[(-delta,delta)]*(3*F)+[(0,None)]*G
    r=linprog(cost,A_ub=Aub,b_ub=bub,bounds=b,method='highs')
    if r.status!=0: return None
    return r.x[:nv],r.fun

def apply(st,dx):
    n,H=st.n,st.H; F=st.F; e1,e2=frames(n)
    nn=n+dx[0:2*F:2,None]*e1+dx[1:2*F:2,None]*e2; nn/=np.linalg.norm(nn,axis=1)[:,None]
    return nn,H+dx[2*F:]

KEEPF=True
def drop_redundant(n,H):
    if KEEPF:
        tri,used=hull_tri(n,H)
        if not used.all(): raise ValueError('redundant')
        return n,H
    for _ in range(5):
        tri,used=hull_tri(n,H)
        if used.all(): return n,H
        n,H=n[used],H[used]
    return n,H

def run(n,H,A,iters=300,delta0=0.02,tag='',tmax=1e9,verbose=True,mv=0.02,mt=0.02,mty=2e-3):
    t0=time.time(); n=n/np.linalg.norm(n,axis=1)[:,None]; H=H/H.min()
    try: n,H=drop_redundant(n,H)
    except ValueError: return None,[]
    st=State(n,H)
    M0,c,g,m,w=merit_state(st,A,mv,mt,mty); delta=delta0; hist=[]
    for it in range(iters):
        if time.time()-t0>tmax: break
        r=step_lp(st,c,g,m,w,delta)
        if r is None: delta*=0.5
        else:
            dx,pred=r; nn,Hn=apply(st,dx); Hn=Hn/Hn.min()
            try:
                nn2,Hn2=drop_redundant(nn,Hn); st2=State(nn2,Hn2)
                if st2.bad>0: raise ValueError
                M1,c1,g1,m1,w1=merit_state(st2,A,mv,mt,mty)
            except Exception as ex:
                M1=1e18
            if M1<M0-1e-9:
                st,c,g,m,w,M0=st2,c1,g1,m1,w1,M1; delta=min(delta*1.3,0.1)
            else: delta*=0.5
        S,U=st.counts()
        hist.append((it,M0,S,U,st.F,delta))
        if verbose and (it%10==0 or U<=1): print(tag,it,'merit %.4f S %d U %d F %d asp %.2f delta %.4f t %.0f'%(M0,S,U,st.F,st.aspect(),delta,time.time()-t0),flush=True)
        if delta<1e-6 or M0<1e-9: break
    return st,hist

def save(st,path,extra=None):
    d={'n':st.n.tolist(),'H':st.H.tolist(),'F':st.F,'V':st.V}
    if extra: d.update(extra)
    json.dump(d,open(path,'w'))

def metrics(n,H):
    """float: centroid g of P (c at origin), mean vertex radius about g, shift |g|/rbar, aspect about c and about g"""
    tri,used=hull_tri(n,H); v,_=vertices(n,H,tri)
    h=ConvexHull(v); vol=0; g=np.zeros(3)
    for s in h.simplices:
        a,b,c=v[s]; w=np.dot(a,np.cross(b,c)); 
        if w<0: w=-w
        vol+=w; g+=w*(a+b+c)
    g/=4*vol
    rb=np.linalg.norm(v-g,axis=1).mean()
    hg=(H-n@g).min(); rg=np.linalg.norm(v-g,axis=1).max()
    return dict(g=g,shift=np.linalg.norm(g)/rb,rbar=rb,aspect_c=np.linalg.norm(v,axis=1).max()/H.min(),aspect_g=rg/hg,vol=vol/6)
