import sys,json,time; sys.path.insert(0,'.')
from r17_lib import *
# usage: r17_homo.py startfile A tmax tag [ds]
f,A,tmax,tag=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),sys.argv[4]; ds=float(sys.argv[5]) if len(sys.argv)>5 else 0.04
r=json.load(open(f)); n=np.array(r['n']); H=np.array(r['H'])
import os; mv=float(os.environ.get('MV','0.02')); kw=dict(mv=mv,mt=mv)
st,h,inf=run3(n,H,A,mode='homotopy',ds=ds,max_ins=int(os.environ.get('INS','0')),tmax=tmax,tag=tag,verbose=False,kw=kw)
b=inf['best']
if b: save(b[0],f'runs/r17/homo_{tag}.json',dict(src=f,A=A,hist=[x for x in h[::5]])); print(tag,'BEST',info(b[0]),'t=%.0f'%inf['time'])
else: print(tag,'no S=U=1 state')
