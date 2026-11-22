#!/bin/sh
# continuation: step the target pronouncedness upward from a start run, re-solving the parameters each time (target mode); prints one JSON line per step
#   sh cma-chain.sh start.json margin outprefix "1.11 1.12 1.13"
cd "$(dirname "$0")"; prev=$1; m=$2; pre=$3
for t in $4; do node ring-cma.mjs --mode target --target $t --margin $m --seed 7 --gens 200 --sigma 0.15 --start $prev --out ${pre}_$t.json > ${pre}_$t.log 2>&1; tail -n1 ${pre}_$t.log | cut -c1-260; prev=${pre}_$t.json; done
