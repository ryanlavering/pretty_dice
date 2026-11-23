import sys,json,numpy as np,subprocess
from r16_lib import hull_tri
def export(path,out):
    J=json.load(open(path)); n=np.array(J['n']); H=np.array(J['H']); tri,used=hull_tri(n,H)
    json.dump({'n':J['n'],'H':J['H'],'tri':tri.tolist()},open(out,'w')); return out
if __name__=='__main__':
    out=export(sys.argv[1],sys.argv[2])
    print(subprocess.run(['node','r16-exact.mjs',out],capture_output=True,text=True).stdout[:1500])
