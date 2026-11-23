"""Round 17 visual lane: convert polyhedron sources to a unified render JSON and classify equilibria (float, generic).
usage (from tools/gomboc-spike-verify):  python3 vis/polyprep.py OUTDIR
Unified body JSON: {name,label,kind:'poly',verts (relative to the CoM, CoM = origin),faces (index cycles, outward CCW),centroid (volume centroid rel. CoM),
                    stable:[face],peaks:[vertex],saddles:[[v,w]],info:{...}}
Float classification (generic: works for non simple vertices), cross-checked against the exact r16 checker for r16 bodies (see main).
"""
import json, sys, os, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_tri_bigint(path):
    J = json.load(open(path)); sc = 2.0**40
    V = np.array([[int(x) / sc for x in p] for p in J['vertices']]); F = [list(map(int, f)) for f in J['faces']]
    return V, F, J

def orient(V, F, inside):
    out = []
    for f in F:
        p = V[f]; n = np.cross(p[1] - p[0], p[2] - p[0])
        if np.dot(n, p.mean(0) - inside) < 0: f = f[::-1]
        out.append(list(f))
    return out

def volume_centroid(V, F):
    # triangulate polygons (fan), signed tetra volumes about the origin
    vol = 0.0; c = np.zeros(3)
    ref = V.mean(0)
    for f in F:
        for k in range(1, len(f) - 1):
            a, b, d = V[f[0]] - ref, V[f[k]] - ref, V[f[k + 1]] - ref
            v = np.dot(a, np.cross(b, d)) / 6.0; vol += v; c += v * (a + b + d) / 4.0
    return ref + c / vol

def analyze(V, F):
    """V relative to the CoM (origin). returns dict with stable faces, peaks, saddles (float, strict tests with tiny tolerance reported)."""
    nF = len(F); N = []; D = []
    for f in F:
        p = V[f]; n = np.cross(p[1] - p[0], p[2] - p[0])
        # polygon plane normal: Newell
        n = np.zeros(3)
        for i in range(len(f)): n += np.cross(p[i], p[(i + 1) % len(f)])
        n /= np.linalg.norm(n); N.append(n); D.append(float(np.dot(n, p.mean(0))))
    N = np.array(N); D = np.array(D)
    # edges -> faces
    ef = {}
    for i, f in enumerate(F):
        for k in range(len(f)):
            a, b = f[k], f[(k + 1) % len(f)]; ef.setdefault((min(a, b), max(a, b)), []).append(i)
    nb = [set() for _ in V]
    for (a, b) in ef: nb[a].add(b); nb[b].add(a)
    # stable: foot inside polygon (strictly) : foot = D n ; inside iff for every edge the foot is on the inner side
    stable = []; marg = []
    for i, f in enumerate(F):
        foot = D[i] * N[i]; m = 1e9
        for k in range(len(f)):
            a, b = V[f[k]], V[f[(k + 1) % len(f)]]; e = b - a
            s = np.dot(np.cross(e, foot - a), N[i]) / np.linalg.norm(e); m = min(m, s)
        marg.append(m)
        if m > 0: stable.append(i)
    peaks = [v for v in range(len(V)) if all(np.dot(V[w] - V[v], V[v]) < 0 for w in nb[v])]
    saddles = []
    for (a, b), fs in ef.items():
        if len(fs) != 2: continue
        i, j = fs
        if not (np.dot(V[b] - V[a], V[a]) < 0 and np.dot(V[a] - V[b], V[b]) < 0): continue  # foot on the line must be interior to the segment: both ends descend toward each other
        g = np.dot(N[i], N[j]); ai = D[i] - D[j] * g; aj = D[j] - D[i] * g
        if ai > 0 and aj > 0: saddles.append([a, b])
    return dict(N=N, D=D, stable=stable, margins=marg, peaks=peaks, saddles=saddles, edges=sorted(ef))

def make_body(name, label, V_abs, F, c=None, extra=None):
    inside = V_abs.mean(0)
    F = orient(V_abs, F, inside)
    g = volume_centroid(V_abs, F)
    if c is None: c = g
    V = V_abs - c
    A = analyze(V, F)
    rbar = float(np.mean(np.linalg.norm(V, axis=1)))
    body = dict(name=name, label=label, kind='poly', verts=V.tolist(), faces=F, centroid=(g - c).tolist(), stable=A['stable'],
                peaks=A['peaks'], saddles=A['saddles'],
                info=dict(F=len(F), V=len(V), S=len(A['stable']), U=len(A['peaks']), H=len(A['saddles']), PH=len(A['stable']) + len(A['peaks']) - len(A['saddles']),
                          shift=float(np.linalg.norm(g - c) / rbar), rmax=float(np.max(np.linalg.norm(V, axis=1))), hmin=float(A['D'].min()), rbar=rbar, **(extra or {})))
    return body

def r16_body(name, label, path, tmp):
    from r16_export import export
    from r16_lib import hull_tri
    J = json.load(open(path)); n = np.array(J['n']); H = np.array(J['H'])
    tri, used = hull_tri(n, H)
    export(path, tmp)
    out = subprocess.run(['node', 'r16-exact.mjs', tmp, tmp + '.out.json'], capture_output=True, text=True, cwd=HERE).stdout
    E = json.load(open(tmp + '.out.json'))
    V = np.array(E['vf']) * 2.0**40; tri = tri.tolist()
    # polygon faces: vertices (indices into tri) containing plane i, ordered around n_i
    F = []
    for i in range(len(n)):
        vs = [t for t, tr in enumerate(tri) if i in tr]
        ctr = V[vs].mean(0); e1 = np.cross(n[i], [1, 0, 0] if abs(n[i][0]) < .9 else [0, 1, 0]); e1 /= np.linalg.norm(e1); e2 = np.cross(n[i], e1)
        vs.sort(key=lambda t: np.arctan2(np.dot(V[t] - ctr, e2), np.dot(V[t] - ctr, e1))); F.append(vs)
    body = make_body(name, label, V, F, c=np.zeros(3))
    ex = json.loads(out); body['info']['exact'] = dict(pass_=ex['pass'], S=ex['S'], U=ex['U'], H=ex['H'], stable=ex['stable'], peaks=ex['peaks'])
    body['info']['float_agrees_exact'] = (body['info']['S'] == ex['S'] and body['info']['U'] == ex['U'] and body['info']['H'] == ex['H'])
    # centroid is meaningful: make_body used c = origin; shift already computed vs volume centroid
    return body

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    R = lambda p: os.path.join(HERE, p)
    bodies = []
    V, F, J = load_tri_bigint(R('runs/r14/homog_S1_92.json')); bodies.append(make_body('homog_S1_92', 'Homogeneous S=1, 92 faces', V, F))
    V, F, J = load_tri_bigint(R('runs/r14/umin_V52s1_a.json')); bodies.append(make_body('umin_90', 'Homogeneous S=1, U=7, 90 faces', V, F))
    V, F, J = load_tri_bigint(R('runs/r13/prism_twist_1000_7.json')); bodies.append(make_body('twist194_S2', 'Homogeneous S=2, 194 faces', V, F))
    tmp = os.path.join(out, '_tmp_r16.json')
    for nm, lab, f in [('w24', 'Weighted S=U=1, 24 faces', 'runs/r16/hop_24_s1.json'), ('w36', 'Weighted S=U=1, 36 faces', 'runs/r16/cont2_36.json'), ('w60', 'Weighted S=U=1, 60 faces', 'runs/r16/camp_s_N32_d0.6_A3.0_r1.json')]:
        bodies.append(r16_body(nm, lab, R(f), tmp))
    for b in bodies:
        json.dump(b, open(os.path.join(out, b['name'] + '.json'), 'w'))
        i = b['info']; print(b['name'], {k: (round(v, 4) if isinstance(v, float) else v) for k, v in i.items() if k != 'exact'}, i.get('exact', {}).get('pass_'))
