import sys,json,subprocess,numpy as np
from r17_lib import *
SP='/tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/'
def cert(f,homog=False,out=None):
    r=json.load(open(f)); n=np.array(r['n']); H=np.array(r['H']); n,H=drop_redundant(n,H); tri,_=hull_tri(n,H)
    tmp=SP+'c17_%d.json'%abs(hash(f)); json.dump({'n':n.tolist(),'H':H.tolist(),'tri':tri.tolist(),'homog':homog},open(tmp,'w'))
    p=subprocess.run(['node','--max-old-space-size=4096','r17-exact.mjs',tmp],capture_output=True,text=True); 
    try: o=json.loads(p.stdout)
    except Exception: print(p.stderr[-500:]); raise
    st=State(n,H); inf=info(st); o.update(float_info=inf,src=f)
    if out: json.dump(o,open(out,'w'))
    return o
if __name__=='__main__':
    hom=sys.argv[1]=='h'
    for f in sys.argv[2:]:
        o=cert(f,hom,f.replace('runs/r17/','runs/r17/cert_'))
        print(f.split('/')[-1],'F',o['F'],'S',o['S'],'U',o['U'],'H',o['H'],'convex',o['convexCert'],'pass',o['pass'],'mStable %.3g mTip %.3g mClimb %.3g mPeak %.3g gap %.3g asp %.2f'%(o.get('mStable',0),o.get('mTip',0),o.get('mClimb',0),o.get('mPeak',0),o.get('mConvexGap',0),o.get('aspect',0)),'bits',o.get('centroidBits'),'gridres',o.get('centroidResidualFloat'))
