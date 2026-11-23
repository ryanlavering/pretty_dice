"""Round 18 task 3c: persistence-guided mesh SLP. Vertices of an exact triangulated convex hull are the variables; the target peak(s) must acquire an
ascending edge (climbing sign), while stable-triangle set, tipping, other peaks and local convexity are held; minimise the L1 step.
Float optimisation; every accepted state is re-certified exactly by r18-eval.mjs (node).  usage: python3 r18_mesh_slp.py body.json out.json [iters] [ntarget]"""
import sys,json,subprocess,numpy as np
from scipy.optimize import linprog
SC=2.0**40
def load(f):
    J=json.load(open(f)); V=np.array([[int(x)/SC for x in p] for p in J['vertices']]); T=np.array(J['faces']); return V,T
def centroid(V,T):
    a,b,c=V[T[:,0]],V[T[:,1]],V[T[:,2]]; w=np.einsum('ij,ij->i',a,np.cross(b,c)); g=((a+b+c)*w[:,None]/4).sum(0)/w.sum(); return g
def edges_info(T):
    nb={}; adj={}
    for t,(a,b,c) in enumerate(T):
        for x,y,z in ((a,b,c),(b,c,a),(c,a,b)): adj[(x,y)]=(t,z)
    ed=[]
    for (x,y),(t,z) in adj.items():
        if x<y: ed.append((x,y,t,z,adj[(y,x)][0],adj[(y,x)][1]))
    nbr=[set() for _ in range(len(set(T.flatten())))]
    for x,y,*_ in ed: nbr[x].add(y); nbr[y].add(x)
    return ed,[sorted(s) for s in nbr]
class M:
    def __init__(s,V,T): s.T=T; s.ed,s.nbr=edges_info(T); s.nv=len(V); s.pairs=[(v,w) for v in range(s.nv) for w in s.nbr[v]]
    def stab(s,x):  # (nt,3) edge margins of the foot of c on each triangle plane (positive = inside)
        V=x.reshape(-1,3); c=centroid(V,s.T); A,B,C=V[s.T[:,0]],V[s.T[:,1]],V[s.T[:,2]]; n=np.cross(B-A,C-A); u=n/np.linalg.norm(n,axis=1)[:,None]; h=np.einsum('ij,ij->i',u,A-c[None]); foot=c[None]+h[:,None]*u
        out=[]
        for P,Q in ((A,B),(B,C),(C,A)):
            e=Q-P; out.append(np.einsum('ij,ij->i',np.cross(e,foot-P),u)/np.linalg.norm(e,axis=1))
        return np.stack(out,1),c
    def asc(s,x,c=None):
        V=x.reshape(-1,3)
        if c is None: c=centroid(V,s.T)
        vi=np.array([p[0] for p in s.pairs]); wi=np.array([p[1] for p in s.pairs]); d=V[wi]-V[vi]; r=V[vi]-c[None]
        return np.einsum('ij,ij->i',d,r)/(np.linalg.norm(d,axis=1)*np.linalg.norm(r,axis=1))
    def conv(s,x):
        V=x.reshape(-1,3); out=[]
        for a,b,t,z,t2,y in s.ed:
            A,B,Z,Y=V[a],V[b],V[z],V[y]; n=np.cross(B-A,Z-A); n/=np.linalg.norm(n); out.append(-np.dot(n,Y-A))
        return np.array(out)
    def classify(s,x):
        sm,c=s.stab(x); stable=(sm.min(1)>0); a=s.asc(x,c); V=x.reshape(-1,3)
        peaks=[v for v in range(s.nv) if all(a[i]<0 for i,p in enumerate(s.pairs) if p[0]==v)]
        return stable,peaks,a
def vec(m,x,spec):
    sm,c=m.stab(x); a=m.asc(x,c); cv=m.conv(x)
    return np.concatenate([sm[spec['stabI'],:].ravel(),sm[spec['tipT'],spec['tipE']],a,cv])
def solve(m,x0,target_vertex,iters,eps,log):
    x=x0.copy(); nv=m.nv
    for it in range(iters):
        st,peaks,a=m.classify(x); S=int(st.sum()); U=len(peaks)
        if target_vertex not in peaks: log.append(('done',it,S,U)); return x,True
        # frozen assignments
        sm,c=m.stab(x); spec={'stabI':np.where(st)[0],'tipT':np.where(~st)[0],'tipE':np.argmin(sm[~st],axis=1)}
        pidx={p:i for i,p in enumerate(m.pairs)}
        rows_lo=[]; rows=[]
        g0=vec(m,x,spec); nS=len(spec['stabI'])*3; nT=len(spec['tipT']); na=len(a)
        # constraint sense: stable margins >= eps_s ; tip margins <= -eps_s ; ascent: peaks (non-target) <= -eps, target best edge >= +eps, others best edge >= eps ; convex >= kappa
        sense=np.zeros(len(g0)); thr=np.zeros(len(g0))
        sense[:nS]=1; thr[:nS]=np.minimum(eps['stab'],0.5*g0[:nS]); sense[nS:nS+nT]=-1; thr[nS:nS+nT]=np.maximum(-eps['stab'],0.5*g0[nS:nS+nT])
        ao=nS+nT
        for v in range(nm_:=nv):
            idx=[pidx[(v,w)] for w in m.nbr[v]]
            if v in peaks and v!=target_vertex:
                for i in idx: sense[ao+i]=-1; thr[ao+i]=min(-eps['asc'],0.5*a[i]) if a[i]<0 else -eps['asc']
            else:
                best=idx[int(np.argmax(a[idx]))]; sense[ao+best]=1; thr[ao+best]=eps['asc'] if v==target_vertex else min(eps['asc'],0.5*a[best])
                if v==target_vertex: pass
        co=ao+na; sense[co:]=1; thr[co:]=np.minimum(eps['conv'],0.5*np.maximum(g0[co:],0))
        act=sense!=0
        n=len(x); h=1e-7; J=np.zeros((len(g0),n))
        for k in range(n):
            xp=x.copy(); xp[k]+=h; xm=x.copy(); xm[k]-=h; J[:,k]=(vec(m,xp,spec)-vec(m,xm,spec))/(2*h)
        J=J[act]; g=g0[act]; sg=sense[act]; th=thr[act]
        # sg*(g+J dx) >= sg*th  ->  -sg*J dx + slack >= ...: sg*(g+Jdx - th) + s >= 0
        R=len(g); delta=eps['tr']
        # vars: dx(n), p(n)>=|dx|, s(R)>=0 ; min sum p + K sum s
        K=1e3
        c_=np.concatenate([np.zeros(n),np.ones(n),K*np.ones(R)])
        A1=np.hstack([-(sg[:,None]*J),np.zeros((R,n)),-np.eye(R)]); b1=sg*(g-th)
        A2=np.hstack([np.eye(n),-np.eye(n),np.zeros((n,R))]); A3=np.hstack([-np.eye(n),-np.eye(n),np.zeros((n,R))])
        res=linprog(c_,A_ub=np.vstack([A1,A2,A3]),b_ub=np.concatenate([b1,np.zeros(2*n)]),bounds=[(-delta,delta)]*n+[(0,None)]*n+[(0,None)]*R,method='highs')
        if res.status!=0: log.append(('lpfail',it)); return x,False
        dx=res.x[:n]; sl=res.x[2*n:].sum()
        if eps.get('dbg') and it==0:
            sv=res.x[2*n:]; idx=np.where(act)[0]; top=np.argsort(-sv)[:6]; print('slack rows',[(int(idx[i]),'stab' if idx[i]<nS else 'tip' if idx[i]<ao else 'asc' if idx[i]<co else 'conv',float(sv[i]),float(g[i]),float(th[i])) for i in top],'nS',nS,'ao',ao,'co',co)
        # accept with backtracking on classification of stable set unchanged
        ok=False
        for f in (1,0.5,0.25,0.1):
            xn=x+f*dx; stn,pkn,_=m.classify(xn)
            if stn.sum()==1 and (len(pkn)<=len(peaks)) and m.conv(xn).min()>0: ok=True; break
        log.append((it,S,U,float(np.abs(dx).sum()),float(sl),f,ok))
        if not ok: eps['tr']*=0.5; 
        else: x=xn
        if eps['tr']<1e-7: break
    return x,False
if __name__=='__main__':
    V,T=load(sys.argv[1]); outf=sys.argv[2]; iters=int(sys.argv[3]) if len(sys.argv)>3 else 30
    m=M(V,T); x=V.ravel(); st,peaks,a=m.classify(x); c=centroid(V,T); r=np.linalg.norm(V-c,axis=1); print('start S',st.sum(),'U',len(peaks),'peaks',peaks)
    order=sorted(peaks,key=lambda p:r[p]); results=[]
    for tv in order[:-1]:
        log=[]; eps={'dbg':1,'stab':1e-4,'asc':1e-4,'conv':1e-6,'tr':float(__import__('os').environ.get('TR','0.02'))*r.mean()}
        xn,ok=solve(m,x,tv,iters,eps,log); st2,pk2,_=m.classify(xn)
        print('target',tv,'ok',ok,'S',st2.sum(),'U',len(pk2),'steps',len(log),log[-1]); results.append(dict(target=tv,ok=ok,S=int(st2.sum()),U=len(pk2),log=[list(map(float,l)) if l[0]!='done' and l[0]!='lpfail' else list(l) for l in log]))
        if ok:
            P=np.round(xn.reshape(-1,3)*SC).astype(np.int64); json.dump({'vertices':[[str(int(q)) for q in p] for p in P],'faces':T.tolist()},open(outf.replace('.json',f'_t{tv}.json'),'w'))
    json.dump(results,open(outf,'w'))
