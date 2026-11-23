import sys,json,glob,os; sys.path.insert(0,'.')
from r17_lib import *
names=[('w24','runs/r17/homo_t24.json'),('w32','runs/r17/homo_mv5_32.json'),('w36','runs/r17/homo_mv5_36.json'),('w40','runs/r17/homo_mv5_40.json'),('w52','runs/r17/homo_mv5_52.json'),('w60','runs/r16/camp_s_N32_d0.6_A3.0_r1.json'),
       ('fx60_S24U31','runs/r17/fx_s0_60_a2.json')]+[(os.path.basename(f)[:-5],f) for f in sorted(glob.glob('runs/r17/r14seed_*.json'))]
idx=[]
for nm,f in names:
    try:
        r=json.load(open(f)); n=np.array(r['n']); H=np.array(r['H']); n,H=drop_redundant(n,H); st=State(n,H); T=Topo3(st); ss=shape_stats(n,H,Topo(st)); inf=info(st)
        faces=[]; 
        mem=[[] for _ in range(st.F)]
        for t,tr in enumerate(st.tri):
            for f in tr: mem[f].append(t)
        e1,e2=frames(n)
        for i,m in enumerate(mem):
            m=np.array(m); p=st.v[m]; q=p-p.mean(0); o=np.argsort(np.arctan2(q@e2[i],q@e1[i])); faces.append(m[o].tolist())
        g=ss['g']; v=st.v; rg=np.linalg.norm(v-g,axis=1); rc=np.linalg.norm(v,axis=1)
        sink=int(np.argmin(H)); near=int((H<=1.05*H.min()).sum()); S,U=st.counts()
        # extra: H count of faces per radial band
        prof=dict(r_about_g_min=float(rg.min()/ss['rbar']),r_about_g_max=float(rg.max()/ss['rbar']),r_about_c_min=float(rc.min()/ss['rbar']),r_about_c_max=float(rc.max()/ss['rbar']),facesWithin5pctOfStableHeight=near,sinkFaceNormal=n[sink].tolist(),peakDirection=(v[np.argmax(rc)]/rc.max()).tolist(),cToCentroid=g.tolist())
        out=dict(name=nm,source=f,vertices=v.tolist(),faces=faces,c=[0,0,0],centroid=g.tolist(),normals=n.tolist(),heights=H.tolist(),S=S,U=U,F=st.F,V=st.V,shift_pct=float(ss['shift']*100),aspect_g=float(ss['aspect_g']),profile=prof,rigor='float S,U (see cert_*.json for exact); homogeneous only if shift_pct~0')
        json.dump(out,open(f'runs/r17/milestone_{nm}.json','w'),default=lambda o:o.item())
        idx.append(dict(name=nm,file=f'milestone_{nm}.json',S=S,U=U,H=int(U-1) if S==1 else None,faces=int(st.F),vertices=int(st.V),shift_pct=round(float(ss['shift']*100),2),aspect_g=round(float(ss['aspect_g']),2),**{k:v for k,v in prof.items() if k.startswith('r_') or k.startswith('faces')}))
    except Exception as e: print('skip',nm,repr(e))
json.dump(idx,open('runs/r17/index.json','w'),indent=1,default=lambda o:o.item())
for x in idx: print(x)
