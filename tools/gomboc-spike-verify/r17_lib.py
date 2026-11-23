"""Round 17: SLP over (unit normals n_i, heights H_i), c = origin, WITH the homogeneous centroid equality g(n,H) = target.
g = volumetric centroid of P = {n_i.x <= H_i} (simple polytope, fixed topology per iteration).  Jacobian of g by complex-step (machine precision),
checked against central finite differences and against dV/dH_i = A_i.  Equality handled as: LP equality row  J dx = target - g0, then Newton (min-norm) projection
onto g = target after each accepted step.  target = s * rbar * u (s = shift fraction, u fixed unit vector); s=0 is homogeneous.
Modes: run3(..., s_sched='fixed0')  -> Newton equality at s=0 from the start;  'homotopy' -> shrink s from the seed's shift while S=U=1 is held."""
import numpy as np, json, time, sys
from scipy.optimize import linprog
from scipy.sparse import csr_matrix, hstack, vstack, identity
from r16_lib import fib,frames,hull_tri,vertices,stable_mask,State,drop_redundant,apply
from r16_lib2 import Cons2,merit2,Topo,shape_stats
from scipy.spatial import ConvexHull

class Topo3:
    def __init__(s,st):
        n,H=st.n,st.H; s.tri=st.tri; F=st.F; e1,e2=frames(n)
        if len(st.redundant)>0: raise ValueError('redundant face')
        mem=[[] for _ in range(F)]
        for t,tr in enumerate(st.tri):
            for f in tr: mem[f].append(t)
        ia=[];ib=[];ic=[];fc=[]
        for i,m in enumerate(mem):
            m=np.array(m); p=st.v[m]; q=p-p.mean(0); o=np.argsort(np.arctan2(q@e2[i],q@e1[i])); m=m[o]
            for k in range(1,len(m)-1): ia.append(m[0]); ib.append(m[k]); ic.append(m[k+1]); fc.append(i)
        s.ia,s.ib,s.ic,s.fc=map(np.array,(ia,ib,ic,fc))
        w=s._w(st.v); s.sg=np.where(w>=0,1.0,-1.0)
    def _w(s,v):
        a,b,c=v[s.ia],v[s.ib],v[s.ic]
        return a[:,0]*(b[:,1]*c[:,2]-b[:,2]*c[:,1])+a[:,1]*(b[:,2]*c[:,0]-b[:,0]*c[:,2])+a[:,2]*(b[:,0]*c[:,1]-b[:,1]*c[:,0])

def gfun(n,H,T):
    M=n[T.tri]; v=np.linalg.solve(M,H[T.tri][:,:,None])[:,:,0]
    w=T.sg*T._w(v); vol6=w.sum()
    g=(w[:,None]*(v[T.ia]+v[T.ib]+v[T.ic])).sum(0)/(4*vol6)
    return g,vol6/6

def gjac(n,H,T,h=1e-30):
    F=len(n); e1,e2=frames(n); J=np.zeros((3,3*F)); Jv=np.zeros(3*F)
    nc=n.astype(complex); Hc=H.astype(complex)
    for i in range(F):
        for q,e in ((0,e1),(1,e2)):
            n2=nc.copy(); x=n2[i]+1j*h*e[i]; n2[i]=x/np.sqrt(x@x)
            g,vol=gfun(n2,Hc,T); J[:,2*i+q]=g.imag/h; Jv[2*i+q]=vol.imag/h
        H2=Hc.copy(); H2[i]+=1j*h; g,vol=gfun(nc,H2,T); J[:,2*F+i]=g.imag/h; Jv[2*F+i]=vol.imag/h
    return J,Jv

def jac_check(n,H,fd=1e-5):
    """returns max abs difference complex-step vs central FD, and dV/dH_i vs face areas"""
    st=State(n,H); T=Topo3(st); J,Jv=gjac(n,H,T); F=len(n); e1,e2=frames(n); Jf=np.zeros_like(J)
    def ev(nn,HH): return gfun(nn,HH,T)[0]
    for i in range(F):
        for q,e in ((0,e1),(1,e2)):
            a=n.copy(); b=n.copy(); xa=n[i]+fd*e[i]; xb=n[i]-fd*e[i]; a[i]=xa/np.linalg.norm(xa); b[i]=xb/np.linalg.norm(xb)
            Jf[:,2*i+q]=(ev(a,H)-ev(b,H))/(2*fd)
        a=H.copy(); b=H.copy(); a[i]+=fd; b[i]-=fd; Jf[:,2*F+i]=(ev(n,a)-ev(n,b))/(2*fd)
    # areas of faces
    A=np.zeros(F); v=st.v
    for k in range(len(T.ia)):
        a,b,c=v[T.ia[k]],v[T.ib[k]],v[T.ic[k]]; A[T.fc[k]]+=0.5*np.linalg.norm(np.cross(b-a,c-a))
    return dict(maxdiff_g=float(np.abs(J-Jf).max()),scale=float(np.abs(J).max()),dV_dH_vs_area=float(np.abs(Jv[2*F:]-A).max()),dV_dn_max=float(np.abs(Jv[:2*F]).max()))

def proj(n,H,target,tol=1e-13,maxit=6):
    """Newton min-norm projection onto g(n,H)=target (topology fixed). returns n,H,resid"""
    for _ in range(maxit):
        st=State(n,H); T=Topo3(st); g,_=gfun(n,H,T); r=target-g
        if np.linalg.norm(r)<tol: return n,H,np.linalg.norm(r)
        J,_=gjac(n,H,T); dx=J.T@np.linalg.solve(J@J.T,r); n,H=apply(st,dx)
    st=State(n,H); T=Topo3(st); g,_=gfun(n,H,T); return n,H,np.linalg.norm(target-g)

def step_lp3(st,c,g0,m,w,delta,T,gc,target,fd=1e-6):
    n,H=st.n,st.H; F=st.F; e1,e2=frames(n); nv=3*F; G=len(g0); J=np.zeros((G,nv))
    for i in range(F):
        for q,e in ((0,e1),(1,e2)):
            n2=n.copy(); nn=n[i]+fd*e[i]; n2[i]=nn/np.linalg.norm(nn); J[:,2*i+q]=(c.g(n2,H)-g0)/fd
        H2=H.copy(); H2[i]+=fd; J[:,2*F+i]=(c.g(n,H2)-g0)/fd
    Jg,_=gjac(n,H,T)
    Aub=hstack([csr_matrix(-J),-identity(G,format='csr')]); bub=g0-m
    Aeq=hstack([csr_matrix(Jg),csr_matrix((3,G))]); beq=target-gc
    cost=np.concatenate([np.zeros(nv),w]); bnd=[(-delta,delta)]*nv+[(0,None)]*G
    r=linprog(cost,A_ub=Aub,b_ub=bub,A_eq=Aeq,b_eq=beq,bounds=bnd,method='highs')
    if r.status!=0: return None
    return r.x[:nv],r.fun

def insert_face(st,c,m,gv,depth=0.03):
    """cut the vertex with the largest climbing violation by a new face (normal along the vertex direction from c=origin, height (1-depth)*|v|)"""
    nty=len(c.tp); nvi=len(c.vi); viol=(m-gv)[nty:nty+nvi]; t=int(c.vi[np.argmax(viol)]); v=st.v[t]; nv=v/np.linalg.norm(v)
    return np.vstack([st.n,nv]),np.concatenate([st.H,[(1-depth)*np.linalg.norm(v)*1.0]]) if False else np.concatenate([st.H,[(1-depth)*(v@nv)]])

def run3(n,H,A,mode='fixed0',max_ins=0,s0=None,ds=0.04,ds_min=3e-4,iters=3000,delta0=0.02,tmax=300,L=30.,tag='',verbose=False,stall=40,every=10,kw=None):
    """mode fixed0: target g=0 from the start (homogeneous).  homotopy: target s*rbar*u, start at the seed's own shift (S=U=1 first, then s decreases by ds).
    returns (best_state, history list, info dict). best_state = lowest-shift state with S=U=1 and merit 0 (homotopy) / final state (fixed0)."""
    kw=kw or {}; t0=time.time(); n=n/np.linalg.norm(n,axis=1)[:,None]
    n,H=drop_redundant(n,H); st=State(n,H); T=Topo3(st); g,_=gfun(n,H,T); ss=shape_stats(n,H,Topo(st)); rb=ss['rbar']
    u=g/np.linalg.norm(g) if np.linalg.norm(g)>1e-9 else np.array([0,0,1.]); s=ss['shift'] if mode=='homotopy' else 0.0
    if mode=='fixed0': s=0.0
    def tgt(st_): return s*shape_stats(st_.n,st_.H,Topo(st_))['rbar']*u
    # initial projection to target
    if mode=='fixed0':
        n,H,res=proj(n,H,np.zeros(3)); n,H=drop_redundant(n,H); st=State(n,H)
    hist=[]; best=None; last_ok=None; since=0; M0=None; ins=0; ds0=ds; pend=False
    def ev(st_):
        M,c,gg,m,w=merit2(st_,A,**kw); return M,c,gg,m,w
    M0,c,gg,m,w=ev(st); delta=delta0; T=Topo3(st); resid=0.
    def try_insert():
        nonlocal st,T,M0,c,gg,m,w,s,delta,since,last_ok,pend,ins,ds
        if ins>=max_ins or last_ok is None: return False
        ins+=1; ds=ds0; stl,s_ok=last_ok; Mx,cx,gx,mx,wx=ev(stl)
        try:
            n1,H1=insert_face(stl,cx,mx,gx); n1,H1=drop_redundant(n1,H1); st2=State(n1,H1); T2=Topo3(st2)
        except Exception: return False
        st=st2; T=T2; M0,c,gg,m,w=ev(st); s=s_ok; delta=delta0; since=0; last_ok=None; pend=True; hist.append((it,M0,*st.counts(),s,time.time()-t0)); return True
    for it in range(iters):
        if time.time()-t0>tmax: break
        S,U=st.counts()
        ok=(S==1 and U==1 and M0<1e-9)
        if ok:
            ss=shape_stats(st.n,st.H,Topo(st)); gcur,_=gfun(st.n,st.H,T)
            best=(st,ss['shift'],float(np.linalg.norm(gcur)/ss['rbar']))
            if mode=='homotopy':
                last_ok=(st,s); since=0; pend=False
                if s<=1e-12: break
                s=max(0.0,s-ds)
                try:
                    n1,H1,res=proj(st.n,st.H,s*ss['rbar']*u)
                    n1,H1=drop_redundant(n1,H1); st=State(n1,H1); 
                    if st.bad>0: raise ValueError
                    T=Topo3(st); M0,c,gg,m,w=ev(st)
                except Exception: s=last_ok[1]; st=last_ok[0]; T=Topo3(st); M0,c,gg,m,w=ev(st); ds/=2
                if ds<ds_min:
                    if try_insert(): continue
                    break
                hist.append((it,M0,S,U,s,time.time()-t0)); continue
            else: break
        gcur,_=gfun(st.n,st.H,T); target=tgt(st)
        r=step_lp3(st,c,gg,m,w*L,delta,T,gcur,target)
        acc=False
        if r is None: delta*=0.5
        else:
            dx,pred=r; nn,Hn=apply(st,dx)
            try:
                nn,Hn,res=proj(nn,Hn,target)
                nn2,Hn2=drop_redundant(nn,Hn); st2=State(nn2,Hn2)
                if st2.bad>0: raise ValueError
                M1,c1,g1,m1,w1=ev(st2)
                if not np.isfinite(M1) or c1.ss['hmin_g']<=0: raise ValueError
            except Exception: M1=1e18
            if M1<M0-1e-9:
                sc=c1.ss['hmin_g']; st=State(nn2,Hn2/sc); T=Topo3(st); M0,c,gg,m,w=ev(st); delta=min(delta*1.3,0.1); acc=True; since=0
            else: delta*=0.5
        since+=0 if acc else 1
        S,U=st.counts(); hist.append((it,M0,S,U,s,time.time()-t0))
        if verbose and it%every==0: print(tag,it,'merit %.4f S %d U %d s %.4f F %d delta %.4f t %.0f'%(M0,S,U,s,st.F,delta,time.time()-t0),flush=True)
        if mode=='homotopy' and pend and (since>200 or delta<1e-7): break
        if mode=='homotopy' and (delta<1e-6 or since>stall) and last_ok is not None:
            ds/=2; s=max(0.0,last_ok[1]-ds)
            if ds<ds_min:
                if try_insert(): continue
                break
            st=last_ok[0]
            try:
                n1,H1,res=proj(st.n,st.H,s*shape_stats(st.n,st.H,Topo(st))['rbar']*u)
                n1,H1=drop_redundant(n1,H1); st=State(n1,H1); T=Topo3(st); M0,c,gg,m,w=ev(st); delta=delta0; since=0
            except Exception: break
        elif delta<1e-6: break
    return st,hist,dict(best=best,s=s,time=time.time()-t0,u=u)

def info(st):
    ss=shape_stats(st.n,st.H,Topo(st)); T=Topo3(st); g,_=gfun(st.n,st.H,T); S,U=st.counts()
    return dict(F=st.F,S=S,U=U,shift=float(ss['shift']),resid=float(np.linalg.norm(g)/ss['rbar']),aspect_g=float(ss['aspect_g']),aspect_c=float(ss['aspect_c']))

def save(st,path,extra=None):
    d=dict(n=st.n.tolist(),H=st.H.tolist(),F=st.F,V=st.V); d.update(info(st)); 
    if extra: d.update(extra)
    json.dump(d,open(path,'w'))

# ---- seeds ----
def seed_ecc(N,dl,jit,rs,KK=1.0):
    P=fib(N)*np.array([1,1,KK]); h=ConvexHull(P); n=h.equations[:,:3]; d=-h.equations[:,3]; c=np.array([0,0,dl])
    H=d-n@c; rng=np.random.default_rng(rs); n=n+rng.normal(0,jit,n.shape); return n/np.linalg.norm(n,axis=1)[:,None],H
def seed_sph0(N,jit,rs): return seed_ecc(N,0.0,jit,rs)
def seed_spiral(N,kappa,twist,mu,jit,rs):
    """eccentric seed with Conway-like spiral height field: H = exp(kappa*psi + twist*sin(psi)*cos(phi - mu*psi)), psi = angle from the sink pole (-z), c = origin"""
    P=fib(N); h=ConvexHull(P); n=h.equations[:,:3]; 
    rng=np.random.default_rng(rs); n=n+rng.normal(0,jit,n.shape); n/=np.linalg.norm(n,axis=1)[:,None]
    psi=np.arccos(np.clip(-n[:,2],-1,1)); phi=np.arctan2(n[:,1],n[:,0])
    H=np.exp(kappa*psi+twist*np.sin(psi)*np.cos(phi-mu*psi)); return n,H/H.min()
