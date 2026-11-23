import sys,json,numpy as np,time; from r16_lib2 import *
# r16_hop.py in.json out.json A seed tmax  : basin hopping on shift (S=U=1 held)
r=json.load(open(sys.argv[1])); A=float(sys.argv[3]); rng=np.random.default_rng(int(sys.argv[4])); tmax=float(sys.argv[5]); t0=time.time()
bn,bH=np.array(r['n']),np.array(r['H']); st0=State(bn,bH); best=shape_stats(bn,bH,Topo(st0))['shift']; hops=0; acc=0
while time.time()-t0<tmax:
    sg=rng.choice([0.01,0.03,0.08]); n=bn+rng.normal(0,sg,bn.shape); H=bH*(1+rng.normal(0,sg,bH.shape)); hops+=1
    st,h=run2(n/np.linalg.norm(n,axis=1)[:,None],H,A,iters=300,tmax=40,verbose=False)
    if st is None or st.counts()!=(1,1): continue
    st,h=run2(st.n,st.H,A,iters=3000,tmax=60,lam_sh=1.0,verbose=False)
    if st is None or st.counts()!=(1,1): continue
    sh=shape_stats(st.n,st.H,Topo(st))['shift']
    if sh<best-1e-4: best=sh; bn,bH=st.n,st.H; acc+=1; print('hop',hops,'new best %.4f'%best,flush=True)
json.dump(dict(n=bn.tolist(),H=bH.tolist(),S=1,U=1,shift=float(best)),open(sys.argv[2],'w')); print('done',sys.argv[2],'hops',hops,'acc',acc,'best %.4f'%best)
