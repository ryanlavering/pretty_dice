"""Round 17 owner note 2: Morse cancellation pairs (peak, saddle) of an exactly classified body (r15-dump.mjs output). Float geometry from exact classification sets.
Ascent graph on vertices: v -> w when (w-v).(v-c)>0 ; from each endpoint of a saddle edge follow the steepest ascent (max d|x-c|/|w-v|) to a peak.
Reported per pair: chain length, barrier (r_peak - r_foot)/rbar, peak descent margin (cos of the shallowest descent angle), min dihedral turn along the chain, aspect rmax/hmin."""
import json,sys,numpy as np
d=json.load(open(sys.argv[1])); SC=d['scale']; P=np.array(d['P'])/SC; T=np.array(d['T']); c=np.array(d['c'])/SC if d['mode']!='homogeneous' else np.array(d['c'])/SC
nb={i:set() for i in range(len(P))}
for a,b,e in T: 
    for x,y in((a,b),(b,e),(a,e)): nb[x].add(y); nb[y].add(x)
r=np.linalg.norm(P-c,axis=1); rbar=r.mean()
N=np.cross(P[T[:,1]]-P[T[:,0]],P[T[:,2]]-P[T[:,0]]); N/=np.linalg.norm(N,axis=1)[:,None]; hmin=min(((P[T[i,0]]-c)@N[i]) for i in range(len(T)))
vf={i:[] for i in range(len(P))}
for k,t in enumerate(T):
    for v in t: vf[v].append(k)
def asc(v,w): return (P[w]-P[v])@(P[v]-c)/(np.linalg.norm(P[w]-P[v])*r[v])
def climb(v):
    path=[v]
    while True:
        best=max(nb[v],key=lambda w:asc(v,w)); 
        if asc(v,best)<=0: return path
        v=best; path.append(v)
        if len(path)>200: return path
peaks=set(d['peaks']); rows=[]
for a,b in d['saddles']:
    A,B=P[a],P[b]; e=B-A; t=(c-A)@e/(e@e); foot=A+t*e; rf=np.linalg.norm(foot-c)
    for end in (a,b):
        ch=climb(end); pk=ch[-1]; assert pk in peaks or True
        turns=[]
        for v in ch:
            for k1 in vf[v]:
                for k2 in vf[v]:
                    if k1<k2 and len(set(T[k1])&set(T[k2]))==2: turns.append(np.degrees(np.arccos(np.clip(N[k1]@N[k2],-1,1))))
        desc=max(asc(pk,w) for w in nb[pk])
        rows.append(dict(saddle=(int(a),int(b)),peak=int(pk),isPeak=bool(pk in peaks),chain=len(ch),barrier=float((r[pk]-rf)/rbar),peakDescent=float(desc),minTurnDeg=float(min(turns)) if turns else None,aspect=float(r.max()/hmin),rpeak=float(r[pk]/rbar),rfoot=float(rf/rbar)))
json.dump(rows,open(sys.argv[2],'w'),indent=1)
print('peaks',sorted(peaks),'rbar %.3f hmin/rbar %.3f aspect %.2f'%(rbar,hmin/rbar,r.max()/hmin))
for x in sorted(rows,key=lambda x:x['barrier']): print(x)
