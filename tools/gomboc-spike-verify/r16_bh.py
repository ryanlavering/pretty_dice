import sys,numpy as np,json,time; from r16_lib import *
def bh(F,A,seed,hops,its=200,sig=0.02,tmax=1e9,verbose=True,init=None,tag=''):
    rng=np.random.default_rng(seed); t0=time.time()
    if init is None:
        n=fib(F)+rng.normal(0,0.03,(F,3)); H=1+0.3*rng.random(F)
        for _ in range(20):
            st,h=run(n,H,A,iters=its,verbose=False)
            if st is not None: break
            n=fib(F)+rng.normal(0,0.03,(F,3)); H=1+0.3*rng.random(F)
    else:
        st,h=run(init[0],init[1],A,iters=its,verbose=False)
    best=st; bs=lambda s:(3*(s.counts()[0]-1)+(s.counts()[1]-1), merit_state(s,A)[0])
    hist=[]
    for hop in range(hops):
        if time.time()-t0>tmax: break
        sg=sig*rng.choice([0.3,1,3])
        n=best.n+rng.normal(0,sg,best.n.shape); H=best.H*(1+rng.normal(0,sg,best.H.shape))
        # perturb only a random subset sometimes
        if rng.random()<0.5:
            mk=rng.random(len(n))<0.3; n=np.where(mk[:,None],n,best.n); H=np.where(mk,H,best.H)
        s2,h=run(n,H,A,iters=its,verbose=False)
        if s2 is None: continue
        if bs(s2)<bs(best): best=s2
        hist.append((hop,best.counts(),bs(best)[1]))
        if verbose and hop%10==0: print(tag,hop,'best S,U',best.counts(),'merit %.3f'%bs(best)[1],'asp %.2f %.0fs'%(best.aspect(),time.time()-t0),flush=True)
        if best.counts()==(1,1): break
    return best,hist
if __name__=='__main__':
    F=int(sys.argv[1]);A=float(sys.argv[2]);seed=int(sys.argv[3]);hops=int(sys.argv[4])
    b,h=bh(F,A,seed,hops,tag=f'F{F}A{A}s{seed}')
    print('FINAL',F,A,seed,b.counts(),'merit %.3f'%merit_state(b,A)[0],'asp %.2f'%b.aspect())
    save(b,f'runs/r16/bh_F{F}_A{A}_s{seed}.json',{'SU':b.counts()})
