import sys,json,time,os; sys.path.insert(0,'.')
from r17_lib import *
# usage: r17_fixed.py seedtype N param A tmax tag rs   seedtype: sph0|ecc|spiral ; param: ecc dl / spiral kappa
typ,N,par,A,tmax,tag,rs=sys.argv[1],int(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),float(sys.argv[5]),sys.argv[6],int(sys.argv[7])
mv=float(os.environ.get('MV','0.02')); kw=dict(mv=mv,mt=mv)
if typ=='sph0': n,H=seed_sph0(N,0.01,rs)
elif typ=='ecc': n,H=seed_ecc(N,par,0.01,rs)
else: n,H=seed_spiral(N,par,float(os.environ.get('TW','0.1')),float(os.environ.get('MU','1.0')),0.01,rs)
try: st,h,inf=run3(n,H,A,mode='fixed0',tmax=tmax,tag=tag,verbose=False,kw=kw)
except Exception as e: print(tag,'FAIL',repr(e)); sys.exit()
i=info(st); hh=h[::max(1,len(h)//12)]
# lowest-U trace
print(tag,'F',i['F'],'S',i['S'],'U',i['U'],'shift %.1e resid %.1e asp_g %.2f its %d t %.0f'%(i['shift'],i['resid'],i['aspect_g'],len(h),inf['time']),'trace(S,U)',[(x[2],x[3]) for x in hh],flush=True)
save(st,f'runs/r17/fx_{tag}.json',dict(typ=typ,N=N,par=par,A=A,mv=mv,hist=[x[:6] for x in h[::10]],ok=inf['best'] is not None))
