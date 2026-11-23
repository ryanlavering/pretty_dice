# Goemboec farm (PD-207, lane v42-gomboc-farm)

Unattended batch: pick (seed, target ratio 1.10-1.18, start kind) -> `ring-pers.mjs` (round 10 settings: persistence at L5 as cost, pw 1000, margin 0.02, 16 members, 350-450 gens) -> sanity (ratio within 0.004, badness < 5e-5, convexity margin > 0.01) -> de-dup (signature RMS radius < 2 percent to the catalogue or the five round 10 bodies = reject) -> full verification -> catalogue.

Start kinds: `cont` (round 10 / catalogued body, tiny perturbation), `near` (2-4 CMA units), `far` (6-12 units, twist/oval/axial parameters differ), `rand` (broad random draw).

Accept only: winding +2/-0 at L5 (6/edge), L6 (4/edge), L7 (3/edge); K min > 0.01; support-function persistence at L6 <= 3e-4; tolerance region M recomputed at L6 nonempty with the origin in M. Rigor label: numerically verified (L5/L6/L7). Then 20 page-physics rolls (`roll-harness.mjs`, zero shift) are recorded.

* Start: `nohup nice -n 10 setsid sh tools/gomboc-spike-verify/farm/farm.sh [hours=7] [workers=3] > runs/farm/farm.log 2>&1 &` (3 workers max)
* Stop: `touch runs/farm/STOP` (workers finish their current iteration, up to about 10 min); PID/deadline in `runs/farm/farm.pid.txt` (the farm.sh PID; `kill -- -PID` kills the group).
* Collect: `node tools/gomboc-spike-verify/farm/collect.mjs` (count, ratio histogram, yield per target, failure stages, nearest-neighbour distances).
* Outputs: `runs/farm/catalogue.json`, `runs/farm/bodies/NNN.json` (committed); `runs/farm/rejects.jsonl` (what failed, per iteration); `runs/farm/work/` and logs stay untracked. `FARM_DIR` overrides the output directory.
