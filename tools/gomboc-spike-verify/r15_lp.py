"""Round 15: offset-space LP for S=U=1 (reviewer's formulation). Fixed unit normals n_i, variables d_i (offsets), CoM c, margin t.
 type: dual triangulation = hull of the normals (local 'Delaunay' conditions are linear in d)
 S=1: each non-sink face has a chosen tipping neighbour (H_k < cos*H_j - t); the sink has none (H_k > cos*H_j + t)
 U=1: each vertex except one has a chosen climbing component (lambda_k < -t), lambda=G^-1 H_ijk
 aspect: heights H_i>=1, vertex distance |x_v-c|<=R (inner polygonal approximation with NDIR directions)."""
import numpy as np, json
from scipy.spatial import ConvexHull
from scipy.optimize import linprog
METHOD='highs'; INTEG=1; HMAX=3.5
def fib(m):
    i=np.arange(m)+.5; z=1-2*i/m; r=np.sqrt(1-z*z); p=np.pi*(1+5**.5)*i; return np.c_[r*np.cos(p),r*np.sin(p),z]
class Body:
    def __init__(s,n,NDIR=300,tri=None):
        s.n=np.array(n); s.nf=len(n)
        if tri is None: h=ConvexHull(s.n,qhull_options='Qt'); tri=[tuple(int(x) for x in t) for t in h.simplices]
        s.tri=tri
        s.N=[s.n[list(t)] for t in s.tri]; s.Ninv=[np.linalg.inv(N) for N in s.N]; s.Ginv=[np.linalg.inv(N@N.T) for N in s.N]
        s.nbr=[set() for _ in range(s.nf)]; s.edges={}
        for ti,t in enumerate(s.tri):
            for a in t:
                for b in t:
                    if a!=b: s.nbr[a].add(b)
            for a,b in [(t[0],t[1]),(t[1],t[2]),(t[2],t[0])]: s.edges.setdefault(frozenset((a,b)),[]).append(ti)
        s.cos=s.n@s.n.T; s.U=fib(NDIR); s.rho=np.arccos(1)  # covering radius estimated below
        from scipy.spatial import cKDTree
        q=fib(4000); dist,_=cKDTree(s.U).query(q); s.rho=2*np.arcsin(dist.max()/2)
    def Hv(s,d,c): return d-s.n@c
    def verts(s,d):  # vertex positions per hull triangle
        return np.array([s.Ninv[ti]@d[list(t)] for ti,t in enumerate(s.tri)])
    def lam(s,d,c):
        H=s.Hv(d,c); return np.array([s.Ginv[ti]@H[list(t)] for ti,t in enumerate(s.tri)])
    def typeok(s,d):
        X=s.verts(d); worst=1e9
        for e,(t1,t2) in s.edges.items():
            a,b=tuple(e); k=[x for x in s.tri[t1] if x not in e][0]; l=[x for x in s.tri[t2] if x not in e][0]
            worst=min(worst,d[l]-s.n[l]@X[t1])
        return worst
    def stats(s,d,c):
        """float classification: stable faces, peaks, aspect"""
        H=s.Hv(d,c); stable=[j for j in range(s.nf) if all(H[k]>=s.cos[j,k]*H[j] for k in s.nbr[j])]
        L=s.lam(d,c); peaks=[ti for ti in range(len(s.tri)) if (L[ti]>0).all()]
        X=s.verts(d); asp=np.linalg.norm(X-c,axis=1).max()/H.min()
        return stable,peaks,asp
def build_lp(B,assign_tip,sink,assign_vert,free_vert,R,eps,hom=None,cfix=None,trust=None,d0=None,tmax=1.0,Hmin=1.0,tS=None):
    nf=B.nf; nz=nf+4; it=nf+3; rows=[]; rhs=[]
    def Hrow(k,coef=1.0):
        r=np.zeros(nz); r[k]+=coef; r[nf:nf+3]-=coef*B.n[k]; return r
    for j,k in assign_tip.items():  # H_k - cos H_j + t <= 0
        r=Hrow(k)-B.cos[j,k]*Hrow(j); r[it]=(1 if tS is None else 0); rows.append(r); rhs.append(0 if tS is None else -tS)
    for k in B.nbr[sink]:           # cos H_s - H_k + t <= 0
        r=B.cos[sink,k]*Hrow(sink)-Hrow(k); r[it]=(1 if tS is None else 0); rows.append(r); rhs.append(0 if tS is None else -tS)
    for ti,kk in assign_vert.items():  # lambda_kk + t <= 0
        t=list(B.tri[ti]); g=B.Ginv[ti][kk]; r=np.zeros(nz)
        for a,fa in enumerate(t): r+=g[a]*Hrow(fa)/np.abs(g).sum()
        r[it]=1; rows.append(r); rhs.append(0)
    for e,(t1,t2) in B.edges.items():  # type: n_l . v_ijk <= d_l - eps
        a,b=tuple(e); k=[x for x in B.tri[t1] if x not in e][0]; l=[x for x in B.tri[t2] if x not in e][0]
        w=B.n[l]@B.Ninv[t1]; r=np.zeros(nz)
        for q,fa in enumerate(B.tri[t1]): r[fa]+=w[q]
        r[l]-=1; rows.append(r); rhs.append(-eps)
    for i in range(nf):  # H_i >= Hmin
        rows.append(-Hrow(i)); rhs.append(-Hmin)
    lim=R*np.cos(B.rho)
    for ti,t in enumerate(B.tri):  # u_s . Ninv H <= lim
        M=B.U@B.Ninv[ti]; 
        for s_ in range(len(B.U)):
            r=np.zeros(nz)
            for q,fa in enumerate(t): r+=M[s_,q]*Hrow(fa)
            rows.append(r); rhs.append(lim)
    A=np.array(rows); b=np.array(rhs); cost=np.zeros(nz); cost[it]=-1
    bounds=[(None,None)]*nf+[(None,None)]*3+[(None,tmax)]
    Aeq=[];beq=[]
    if cfix is not None:
        for q in range(3): bounds[nf+q]=(cfix[q],cfix[q])
    if hom is not None:  # c = c0 + J (d-d0)
        c0,J=hom
        for q in range(3):
            r=np.zeros(nz); r[nf+q]=1; r[:nf]=-J[q]; Aeq.append(r); beq.append(c0[q]-J[q]@d0)
    if trust is not None:
        for i in range(nf): bounds[i]=(d0[i]-trust,d0[i]+trust)
    res=linprog(cost,A_ub=A,b_ub=b,A_eq=np.array(Aeq) if Aeq else None,b_eq=np.array(beq) if beq else None,bounds=bounds,method=METHOD)
    return res
def centroid(B,d):
    """exact-type centroid of polytope with fixed type (tri of normals): face polygons from the dual triangles around each face."""
    X=B.verts(d); tri_of=[[] for _ in range(B.nf)]
    for ti,t in enumerate(B.tri):
        for f in t: tri_of[f].append(ti)
    V=0; Cs=np.zeros(3); o=np.zeros(3)
    for f in range(B.nf):
        ts=tri_of[f]; pts=X[ts]; m=pts.mean(0); u=B.n[f]; e1=np.cross(u,[1,0,0] if abs(u[0])<.9 else [0,1,0]); e1/=np.linalg.norm(e1); e2=np.cross(u,e1)
        ang=np.arctan2((pts-m)@e2,(pts-m)@e1); order=np.argsort(ang); P=pts[order]
        for a in range(len(P)):
            p,q=P[a],P[(a+1)%len(P)]; # tetra (0,m,p,q) relative to origin o=0
            v=np.dot(m,np.cross(p,q))/6
            V+=v; Cs+=v*(m+p+q)/4
    return Cs/V,V
def jac(B,d,h=1e-6):
    J=np.zeros((3,B.nf))
    for i in range(B.nf):
        e=np.zeros(B.nf); e[i]=h; J[:,i]=(centroid(B,d+e)[0]-centroid(B,d-e)[0])/(2*h)
    return J

def dual_tri(n,T,P):
    """type from a triangulated body: each vertex (cell of m faces) is triangulated by the cap hull of its m normals (regular triangulation)."""
    V=len(P); fa=[[] for _ in range(V)]
    for i,t in enumerate(T):
        for v in t: fa[v].append(i)
    tri=[]
    for v in range(V):
        f=fa[v]
        if len(f)==3: tri.append(tuple(f)); continue
        pts=n[f]; ctr=pts.mean(0); h=ConvexHull(pts,qhull_options='Qt')
        for sm,eq in zip(h.simplices,h.equations):
            if eq[:3]@ctr/np.linalg.norm(ctr)>0.0 and eq[3]*-1>0 and eq[:3]@ctr>0: tri.append(tuple(f[k] for k in sm))
    return tri

from scipy.optimize import milp, LinearConstraint, Bounds
from scipy.sparse import csr_matrix, hstack as sphstack, vstack as spvstack
def build_milp(B,assign_tip,sink,free_vert,R,eps,tS,cfix,tlimit=300,M=12.0,Hmin=1.0,hom=None,d0=None,trust=None,tipbin=False):
    """as build_lp but the climbing component of each vertex is a binary choice (MILP). returns (res, z, info)"""
    nf=B.nf; nt=len(B.tri); nz=nf+4; it=nf+3
    vs=[ti for ti in range(nt) if ti!=free_vert]; nb=3*len(vs); NV=nz+nb
    rows=[];lo=[];hi=[]
    def add(r,l,h):
        rows.append(r); lo.append(l); hi.append(h)
    def pad(r): return np.r_[r,np.zeros(nb)]
    def Hrow(k,coef=1.0):
        r=np.zeros(nz); r[k]+=coef; r[nf:nf+3]-=coef*B.n[k]; return r
    for j,k in assign_tip.items(): add(pad(Hrow(k)-B.cos[j,k]*Hrow(j)),-np.inf,-tS)
    for k in B.nbr[sink]: add(pad(B.cos[sink,k]*Hrow(sink)-Hrow(k)),-np.inf,-tS)
    for vi,ti in enumerate(vs):
        t=list(B.tri[ti]); 
        for kk in range(3):
            r=np.zeros(NV)
            for a,fa in enumerate(t): r[:nz]+=B.Ginv[ti][kk][a]*Hrow(fa)
            Mr=M+HMAX*np.abs(B.Ginv[ti][kk]).sum(); r[it]=1; r[nz+3*vi+kk]=Mr; add(r,-np.inf,Mr)   # lambda_k + t <= Mr(1-z)
        r=np.zeros(NV); r[nz+3*vi:nz+3*vi+3]=1; add(r,1,np.inf)
    for e,(t1,t2) in B.edges.items():
        k=[x for x in B.tri[t1] if x not in e][0]; l=[x for x in B.tri[t2] if x not in e][0]
        w=B.n[l]@B.Ninv[t1]; r=np.zeros(nz)
        for q,fa in enumerate(B.tri[t1]): r[fa]+=w[q]
        r[l]-=1; add(pad(r),-np.inf,-eps)
    for i in range(nf): add(pad(-Hrow(i)),-np.inf,-Hmin)
    lim=R*np.cos(B.rho)
    for ti,t in enumerate(B.tri):
        Mx=B.U@B.Ninv[ti]
        for s_ in range(len(B.U)):
            r=np.zeros(nz)
            for q,fa in enumerate(t): r+=Mx[s_,q]*Hrow(fa)
            add(pad(r),-np.inf,lim)
    if hom is not None:
        c0,J=hom
        for q in range(3):
            r=np.zeros(NV); r[nf+q]=1; r[:nf]=-J[q]; v=c0[q]-J[q]@d0; add(r,v,v)
    lb=np.full(NV,-np.inf); ub=np.full(NV,np.inf); lb[nz:]=0; ub[nz:]=1; ub[it]=1.0; lb[it]=-5
    for q in range(3): lb[nf+q]=ub[nf+q]=cfix[q]
    if trust is not None:
        lb[:nf]=d0-trust; ub[:nf]=d0+trust
    cost=np.zeros(NV); cost[it]=-1; integ=np.r_[np.zeros(nz),np.ones(nb)]
    res=milp(cost,constraints=LinearConstraint(csr_matrix(np.array(rows)),lo,hi),integrality=(integ*INTEG),bounds=Bounds(lb,ub),options={'time_limit':tlimit,'disp':False,'mip_rel_gap':1e-3})
    return res,vs
