"""Convert an untrusted .npz (numpy arrays only, no pickle) to JSON for r17-exact.mjs.  Run as: python3 -I npz2json.py in.npz out.json
float64 values are written with repr (round-trips exactly in JS)."""
import sys, json
import numpy as np
d = np.load(sys.argv[1], allow_pickle=False)
out = {}
for k in d.files:
    a = d[k]
    out[k] = a.tolist() if a.dtype.kind in 'fiu' else str(a)
json.dump(out, open(sys.argv[2], 'w'))
print({k: (np.shape(d[k]), str(d[k].dtype)) for k in d.files})
