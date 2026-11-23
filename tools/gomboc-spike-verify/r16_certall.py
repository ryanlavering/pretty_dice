import json,glob,sys
from r16_cert import cert
out={}
for f in sys.argv[1:]:
    o=cert(f); o.pop('vf',None); name=f.split('/')[-1][:-5]
    out[name]={k:o[k] for k in ('F','V','S','U','H','PH','convexCert','pass','shift','aspect_g','aspect_c','rbar','g','peaks','stable','violations','tip','degS','degU','degH')}
    print(name,o['F'],o['V'],'S',o['S'],'U',o['U'],'H',o['H'],'pass',o['pass'],'shift %.3f asp_g %.2f asp_c %.2f'%(o['shift'],o['aspect_g'],o['aspect_c']))
json.dump(out,open('runs/r16/certs.json','w'),indent=0)
