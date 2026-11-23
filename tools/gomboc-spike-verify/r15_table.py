import json,glob,sys,numpy as np
sys.path.insert(0,'.'); from r15_gate import planes
S='/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/'
rows=[]
for f in sorted(glob.glob(S+'dump_*.json')):
    D=json.load(open(f)); P=np.array(D['P'])/D['scale']; T=D['T']; c=np.array(D['c'])/D['scale']
    n,d=planes(P,T); H=d-n@c; asp=np.linalg.norm(P-c,axis=1).max()/H.min()
    ang=[]; edges={}
    for i,t in enumerate(T):
        for k in range(3): edges[(t[k],t[(k+1)%3])]=i
    for (a,b),i in edges.items():
        if a<b: ang.append(np.arccos(np.clip(n[i]@n[edges[(b,a)]],-1,1)))
    th=np.median(ang); F=len(T); lr=np.log(H.max()/H.min())
    rows.append((f.split('dump_')[1][:-5],D['mode'],F,D['S'],D['U'],asp,th,lr,np.pi*th/2))
print('body|mode|F|S|U|aspect|median dihedral(normal angle) rad|ln(hmax/hmin)|pi*theta/2 (needed)')
for r in rows: print('%s|%s|%d|%d|%d|%.2f|%.3f|%.3f|%.3f'%r)
for A in [1.5,2,3]:
    th=2*np.log(A)/np.pi; print('aspect',A,'theta_max %.3f'%th,'predicted F_min = 14.5/theta^2 = %.0f'%(14.5/th**2))
