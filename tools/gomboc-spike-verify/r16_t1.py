import sys,numpy as np; from r16_lib import *
F=int(sys.argv[1]); A=float(sys.argv[2]); seed=int(sys.argv[3]); its=int(sys.argv[4])
rng=np.random.default_rng(seed); n=fib(F)+rng.normal(0,0.02,(F,3)); H=1+0.15*rng.random(F)
st,h=run(n,H,A,iters=its,tag=f'F{F}A{A}s{seed}')
