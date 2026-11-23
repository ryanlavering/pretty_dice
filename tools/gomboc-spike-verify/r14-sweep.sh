#!/bin/sh
# Round 14 task 2 sweep: V vertices (faces about 2V-4), aspect bound RHO, seed; 4 workers. node r14-shift.mjs sph:V out secs seed
cd "$(dirname "$0")"; mkdir -p runs/r14
{ for sd in 1 2; do for V in 14 22 32 52; do echo "$V 2 $sd 600"; done; done
  for V in 14 22 32 52; do echo "$V 1.5 1 600"; done
  for sd in 1 2; do echo "102 2 $sd 900"; done; echo "102 1.5 1 900"
  for sd in 1 2; do echo "202 2 $sd 1200"; done; } | xargs -P4 -L1 sh -c 'RHO=$1 MU=30 T0=0.005 node r14-shift.mjs sph:$0 runs/r14/shift_V$0_rho$1_s$2.json $3 $2 > runs/r14/shift_V$0_rho$1_s$2.log 2>&1'
