import sys,numpy as np; from r16_lib import *
F=int(sys.argv[1]); A=float(sys.argv[2]); its=int(sys.argv[3])
for seed in range(int(sys.argv[4])):
    rng=np.random.default_rng(seed); n=fib(F)+rng.normal(0,0.03,(F,3)); H=1+0.3*rng.random(F)
    t=time.time(); st,h=run(n,H,A,iters=its,tag='',verbose=False)
    S,U=st.counts(); print(F,A,seed,'merit %.3f S %d U %d F %d V %d it %d  %.0fs'%(h[-1][1],S,U,st.F,st.V,len(h),time.time()-t),flush=True)
