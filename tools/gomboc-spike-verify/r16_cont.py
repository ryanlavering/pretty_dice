import sys,json,numpy as np,time; from r16_lib2 import *
# r16_cont.py in.json out.json A tmax lam
r=json.load(open(sys.argv[1])); A=float(sys.argv[3]); t=float(sys.argv[4]); lam=float(sys.argv[5])
st,h=run2(np.array(r['n']),np.array(r['H']),A,iters=20000,tmax=t,lam_sh=lam,verbose=False)
S,U=st.counts(); ss=shape_stats(st.n,st.H,Topo(st))
json.dump(dict(n=st.n.tolist(),H=st.H.tolist(),A=A,S=S,U=U,shift=float(ss['shift']),asp=float(ss['aspect_g']),hist=[x[:8] for x in h[::10]]),open(sys.argv[2],'w'))
print(sys.argv[2],'S',S,'U',U,'F',st.F,'shift %.3f asp %.2f its %d'%(ss['shift'],ss['aspect_g'],len(h)),flush=True)
