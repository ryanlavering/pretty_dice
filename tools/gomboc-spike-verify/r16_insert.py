import sys,json,numpy as np
from r16_lib2 import *
RHO=float(__import__("os").environ.get("RHO","6.5"))
def insert(f):
    r=json.load(open(f)); n=np.array(r['n']); H=np.array(r['H']); st=State(n,H); ss=shape_stats(n,H,Topo(st))
    g=ss['g']; Vb=ss['vol']; s=np.linalg.norm(g); u=-g/s   # c=origin, g centroid; insert must pull CoM from g toward c: insert on the c side of g, along u=(c-g)/|g|
    tgt=s
    best=None; mx=(0,None)
    for vf in np.linspace(0.002,0.6,600):
        v=vf*Vb; rad=(3*v/(4*np.pi))**(1/3)
        # ball centre p=g+d u fits: n_j.p + rad <= H_j
        nu=n@u; slack=H-n@g-rad
        if (slack<=0).any(): break
        dm=np.min(np.where(nu>1e-12,slack/np.maximum(nu,1e-12),1e9))
        sh=(RHO-1)*v*dm/(Vb+(RHO-1)*v)
        if sh>mx[0]: mx=(sh,dict(vol_frac=vf,mass_frac=RHO*v/(Vb+(RHO-1)*v)))
        if sh>=tgt:
            # reduce d so that shift equals target exactly
            d=tgt*(Vb+(RHO-1)*v)/((RHO-1)*v); best=dict(vol_frac=vf,mass_frac=RHO*v/(Vb+(RHO-1)*v),d_over_rbar=d/ss['rbar'],ball_r_over_rbar=rad/ss['rbar'],dmax_over_rbar=dm/ss['rbar'],shift=tgt/ss['rbar']); break
    if best is None: best=dict(unreachable='max ball-insert shift %.3f of rbar at'%(mx[0]/ss['rbar']),at=mx[1])
    return best,ss
if __name__=='__main__':
    for f in sys.argv[1:]:
        b,ss=insert(f); print(f.split('/')[-1],'F',len(json.load(open(f))['n']),'shift %.3f'%ss['shift'],b)
