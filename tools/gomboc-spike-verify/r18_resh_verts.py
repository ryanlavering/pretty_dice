import numpy as np, json, itertools, sys
z=np.load('/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/controls-data/reshetov14_dyadic.npz',allow_pickle=False)
N=z[z.files[0]]; D=z[z.files[1]]; F=len(D); V=[]
for i,j,k in itertools.combinations(range(F),3):
    M=np.array([N[i],N[j],N[k]]); 
    if abs(np.linalg.det(M))<1e-14: continue
    x=np.linalg.solve(M,[D[i],D[j],D[k]])
    if np.all(N@x<=D+1e-12*np.abs(D).max()) :
        if not any(np.linalg.norm(x-v)<1e-9 for v in V): V.append(x)
V=np.array(V); print(len(V)); 
# centre and rescale so mean radius ~ 1.5 about vertex mean
c=V.mean(0); r=np.linalg.norm(V-c,axis=1).mean(); V=(V-c)*(1.5/r)
json.dump({'vertices':[[str(int(round(x*2**40))) for x in p] for p in V],'scale':'2^-40'},open('runs/r18/resh14_verts.json','w'))
