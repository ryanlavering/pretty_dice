"""Numerical tests of the visual observations (float). python3 vis/obs_tests.py DATADIR
T1: are the unstable vertices (peaks) on one great / small circle?  rms angular distance to the best-fit circle, versus the same statistic for random point sets of the same size (Monte Carlo, 20000 draws).
T2: how close in height are the faces around the stable face?  d_k / d_stable for edge-neighbours and rank statistics over all faces."""
import json, sys, numpy as np
D = sys.argv[1]; rng = np.random.default_rng(1)
def circfit(U, through_origin):
    # best plane n.u = d: minimise sum (n.u - d)^2 over unit n; d free (small circle) or 0 (great circle). return rms angular distance (rad) to the circle
    if through_origin:
        w, v = np.linalg.eigh(U.T @ U); n = v[:, 0]; d = 0.0
    else:
        m = U.mean(0); w, v = np.linalg.eigh((U - m).T @ (U - m)); n = v[:, 0]; d = n @ m
    # angular distance of u to the circle {n.x = cos a}: |arcsin(n.u) - arcsin(d')|; use small-circle with radius a: |asin(n.u) - asin(c)| where circle at height c=d/|...| (U unit: n.u = c)
    z = U @ n; c = z.mean() if not through_origin else 0.0
    return float(np.sqrt(np.mean((np.arcsin(np.clip(z, -1, 1)) - np.arcsin(c)) ** 2))), n, c
def rand_stat(k, through_origin, N=20000):
    s = np.empty(N)
    for i in range(N):
        U = rng.normal(size=(k, 3)); U /= np.linalg.norm(U, axis=1)[:, None]; s[i] = circfit(U, through_origin)[0]
    return s
res = {}
for nm in ['homog_S1_92', 'umin_90', 'twist194_S2']:
    b = json.load(open(f'{D}/{nm}.json')); V = np.array(b['verts']); pk = b['peaks']; U = V[pk] / np.linalg.norm(V[pk], axis=1)[:, None]; k = len(pk)
    g, ng, _ = circfit(U, True); s, ns, c = circfit(U, False); rg = rand_stat(k, True, 4000); rs = rand_stat(k, False, 4000)
    res[nm] = dict(k=k, rms_great_deg=np.degrees(g), p_great=float(np.mean(rg <= g)), rms_small_deg=np.degrees(s), small_circle_polar_angle_deg=float(np.degrees(np.arccos(np.clip(c, -1, 1)))), p_small=float(np.mean(rs <= s)),
                   random_median_great_deg=float(np.degrees(np.median(rg))), random_median_small_deg=float(np.degrees(np.median(rs))))
    # relation to the stable face normal: angle between best circle axis and the stable normal
    F = b['faces']; fs = b['stable']; f = F[fs[0]]; p = V[f]; n = np.cross(p[1] - p[0], p[2] - p[0]); n /= np.linalg.norm(n)
    res[nm]['angle_circle_axis_to_stable_normal_deg'] = float(np.degrees(np.arccos(abs(ns @ n))))
    res[nm]['angle_stable_normal_to_circle_plane_deg_(small_circle_axis)'] = res[nm]['angle_circle_axis_to_stable_normal_deg']
# T2
t2 = {}
for nm in ['homog_S1_92', 'umin_90', 'twist194_S2', 'w24', 'w36', 'w60']:
    b = json.load(open(f'{D}/{nm}.json')); V = np.array(b['verts']); F = b['faces']
    N = []; d = []
    for f in F:
        p = V[f]; n = np.zeros(3)
        for i in range(len(f)): n += np.cross(p[i], p[(i + 1) % len(f)])
        n /= np.linalg.norm(n); N.append(n); d.append(n @ p.mean(0))
    d = np.array(d); em = {}
    for i, f in enumerate(F):
        for k in range(len(f)):
            a, c = f[k], f[(k + 1) % len(f)]; em.setdefault((min(a, c), max(a, c)), []).append(i)
    adj = {i: set() for i in range(len(F))}
    for fs in em.values():
        if len(fs) == 2: adj[fs[0]].add(fs[1]); adj[fs[1]].add(fs[0])
    st = min(b['stable'], key=lambda i: d[i]); order = np.argsort(d)
    nbr_ratio = sorted(d[list(adj[st])] / d[st])
    ang = lambda i, j: np.degrees(np.arccos(np.clip(N[i] @ N[j], -1, 1)))
    # faces within 5/10/20 percent of the lowest height and their angular distance from the stable normal
    near = {f'within_{int(100*q)}pct': int(np.sum(d <= d[st] * (1 + q))) for q in (0.05, 0.1, 0.2)}
    # random baseline: mean ratio of neighbour heights to own height for a non-stable face's neighbours
    allr = np.mean([np.mean(d[list(adj[i])] / d[i]) for i in range(len(F))])
    t2[nm] = dict(F=len(F), d_stable=float(d[st]), d_max=float(d.max()), neighbour_height_ratios=[round(float(x), 3) for x in nbr_ratio], min_neighbour_ratio=float(nbr_ratio[0]), mean_neighbour_ratio=float(np.mean(nbr_ratio)),
                  mean_neighbour_ratio_all_faces=float(allr), **near, rank_of_second_lowest_ratio=float(d[order[1]] / d[st]), angle_to_second_lowest_deg=float(ang(st, order[1])), stable_is_lowest=bool(order[0] == st))
print(json.dumps(dict(T1=res, T2=t2), indent=1))
json.dump(dict(T1=res, T2=t2), open(f'{D}/obs_tests.json', 'w'))
