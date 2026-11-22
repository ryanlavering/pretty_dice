#!/bin/sh
# Verify a ring-cma.mjs result with the full methods.   sh verify-finalist.sh run.json workdir
# 1) project the ring-family F onto spherical harmonics (degree <= 12, CoM at the origin)  2) winding index at icosphere L5 (6 samples/edge) and L6 (4)
# 3) support-function convexity on dense normals (L4)  4) tolerance region M of the CoM (cm-tolerance.mjs, level 4, 5 samples per edge, ball 3%, step 0.5%)
set -e; R=$1; W=$2; mkdir -p $W; cd "$(dirname "$0")"
P=$(node -e "const r=JSON.parse(require('fs').readFileSync('$R'));console.log(Object.entries(r.params).map(([k,v])=>k+'='+v).join(','))")
node ring-family.mjs "$P" $W/shape.json
echo "== winding index L5 K6"; SHAPEFILE=$W/shape.json node index.mjs 0 5 6 | head -1
echo "== winding index L6 K4"; SHAPEFILE=$W/shape.json node index.mjs 0 6 4 | head -1
echo "== convexity (support-function, L4 normals)"; SHAPEFILE=$W/shape.json node convex.mjs 0
echo "== CoM tolerance region M"; node cm-tolerance.mjs smooth $W/shape.json --radius 0.03 --step 0.005 --level 4 --k 5
