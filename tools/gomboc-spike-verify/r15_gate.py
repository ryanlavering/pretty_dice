"""Round 15 gate: reviewer's offset formulas (floats, from n_i, d_i, c) vs exact BigInt classification dumped by r15-dump.mjs.
usage: python3 r15_gate.py dump.json [dump2.json ...]"""
import json,sys,numpy as np
from scipy.optimize import linprog
def planes(P,T):
    n=[];d=[]
    for a,b,c in T:
        u=np.cross(P[b]-P[a],P[c]-P[a]); u/=np.linalg.norm(u); n.append(u); d.append(u@P[a])
    return np.array(n),np.array(d)
def cone_interior(N,H):
    # x with N x = H (least squares); unstable iff x in relative interior of cone{n_i}: max t s.t. sum lam_i n_i = x, lam_i>=t
    x,res,rk,_=np.linalg.lstsq(N,H,rcond=None); m=len(N)
    if m==3:
        lam=np.linalg.solve(N@N.T,H); return bool((lam>0).all()),x
    A=np.hstack([N.T,np.zeros((3,1))]); Aub=np.hstack([-np.eye(m),np.ones((m,1))]); 
    r=linprog(np.r_[np.zeros(m),-1],A_eq=A,b_eq=x,A_ub=Aub,b_ub=np.zeros(m),bounds=[(None,None)]*m+[(None,1)],method='highs')
    return (r.status==0 and -r.fun>1e-12),x
def classify(P,T,c):
    n,d=planes(P,T); H=d-n@c; F=len(T); V=len(P)
    edge={}
    for i,t in enumerate(T):
        for k in range(3): edge[(t[k],t[(k+1)%3])]=i
    tip=set(); sad=[]
    for (a,b),i in edge.items():
        j=edge[(b,a)]
        if H[j]<(n[i]@n[j])*H[i]: tip.add((i,j))       # face i tips over its edge into face j
        if a<b:
            G=np.array([[1,n[i]@n[j]],[n[i]@n[j],1]]); lam=np.linalg.solve(G,[H[i],H[j]])
            e=P[b]-P[a]; t_=(c-P[a])@e/(e@e)
            if (lam>0).all() and 0<t_<1: sad.append((a,b))
    stable=[i for i in range(F) if not any(t[0]==i for t in tip)]
    fa=[[] for _ in range(V)]
    for i,t in enumerate(T):
        for v in t: fa[v].append(i)
    peaks=[]
    for v in range(V):
        ok,x=cone_interior(n[fa[v]],H[fa[v]])
        if ok: peaks.append(v)
    return stable,tip,sad,peaks,H,n
def main():
  pass
for f in (sys.argv[1:] if __name__=="__main__" else []):
    D=json.load(open(f)); P=np.array(D['P'])/D['scale']; T=D['T']; c=np.array(D['c'])/D['scale']
    stable,tip,sad,peaks,H,n=classify(P,T,c)
    et=set(map(tuple,D['tip'])); es=set(map(tuple,D['saddles'])); 
    sad_set={tuple(sorted(s)) for s in sad}; es={tuple(sorted(s)) for s in es}
    print(f.split('/')[-1],'F',len(T),'| stable exact/formula',sorted(D['stable']),sorted(stable),'| tip edges',len(et),len(tip),'equal',et==tip,'| saddles',len(es),len(sad_set),'equal',es==sad_set,'| peaks',len(D['peaks']),len(peaks),'equal',sorted(D['peaks'])==sorted(peaks))
    if et!=tip: print('  tip diff',sorted(et^tip)[:10])
    if es!=sad_set: print('  saddle diff',sorted(es^sad_set)[:10])
    if sorted(D['peaks'])!=sorted(peaks): print('  peak diff',sorted(set(D['peaks'])^set(peaks)))
    degs=np.bincount([len(x) for x in [[1]]])
