#!/bin/sh
# usage: r12-merge-sweep.sh shape N > out.jsonl   (angle in deg from the seed face normal, height tolerance from the seed face height in body-radius units)
for ang in 3 6 10 15 25 40; do for ht in 0.0005 0.001 0.002 0.004 0.008; do timeout 600 node r12-merge.mjs $1 $2 $ang $ht --exact; done; done
