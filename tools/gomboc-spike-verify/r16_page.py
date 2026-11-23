# python3 r16_page.py ../gomboc-spike.html id|label|file.json [...]  : append exact weighted S=U=1 bodies (n,H planes about c) to the POLYS block (keeps all existing entries)
import sys,json,numpy as np
from r16_lib2 import *
from r16_cert import cert
html=sys.argv[1]; s=open(html).read(); A='/*POLYS-BEGIN*/const POLYS='; a=s.index(A)+len(A); b=s.index(';/*POLYS-END*/'); P=json.loads(s[a:b]); P=[p for p in P if not p['id'].startswith('m1_')]
for sp in sys.argv[2:]:
    pid,label,f=sp.split('|'); r=json.load(open(f)); n=np.array(r['n']); H=np.array(r['H']); o=cert(f); assert o['pass'], 'not exact pass'
    st=State(n,H); ss=shape_stats(n,H,Topo(st)); g=ss['g']; rm=ss['rbar']; v=st.v
    Q=((v-g)/rm); planes=[[*map(lambda x:round(float(x),9),n[i]),round(float((H[i]-n[i]@g)/rm),9)] for i in range(len(n))]
    com=(-g/rm); sink=int(np.argmin(H)); pk=v[o['peaks'][0]]; un=pk/np.linalg.norm(pk)
    w=dict(com=[round(float(x),9) for x in com],shiftPct=round(100*float(ss['shift']),1),stableNormal=[round(float(x),9) for x in n[sink]],exactS=o['S'],exactU=o['U'],exactH=o['H'],marginWanted=0,marginOther=0,aspect=round(float(ss['aspect_g']),2))
    P.append(dict(id=pid,label=label,weighted=w,faces=len(n),S=o['S'],U=o['U'],H=o['H'],cert=True,globalOK=True,planes=planes,verts=[[round(float(x),6) for x in q] for q in Q],stable=[w['stableNormal']],unstable=[round(float(x),6) for x in un]))
    print(pid,len(n),'verts',len(Q),'shift',w['shiftPct'],'stable face',sink)
open(html,'w').write(s[:a]+json.dumps(P,separators=(',',':'))+s[b:])
