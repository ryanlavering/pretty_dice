import sys,json,glob,subprocess,numpy as np
from r16_lib2 import *
def cert(f,out=None):
    r=json.load(open(f)); n=np.array(r['n']); H=np.array(r['H']); tri,_=hull_tri(n,H)
    tmp='/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/c.json'; json.dump({'n':r['n'],'H':r['H'],'tri':tri.tolist()},open(tmp,'w'))
    o=json.loads(subprocess.run(['node','r16-exact.mjs',tmp],capture_output=True,text=True).stdout)
    st=State(n,H); ss=shape_stats(n,H,Topo(st))
    o.update(shift=float(ss['shift']),aspect_g=float(ss['aspect_g']),aspect_c=float(ss['aspect_c']),g=ss['g'].tolist(),rbar=float(ss['rbar']),vol=float(ss['vol']))
    return o
if __name__=='__main__':
    for f in sys.argv[1:]:
        o=cert(f); print(f.split('/')[-1],'F',o['F'],'V',o['V'],'S',o['S'],'U',o['U'],'H',o['H'],'cert',o['convexCert'],'pass',o['pass'],'shift %.3f asp_g %.2f'%(o['shift'],o['aspect_g']))
