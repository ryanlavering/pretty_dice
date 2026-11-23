#!/bin/sh
# Goemboec farm: sh farm.sh [deadline_hours=7] [workers=3]. Stops when runs/farm/STOP exists (after current iterations finish) or at the deadline.
D=$(cd "$(dirname "$0")" && pwd); F=${FARM_DIR:-$D/../../../runs/farm}; mkdir -p $F; H=${1:-7}; NW=${2:-3}; [ $NW -gt 3 ] && NW=3
DL=$(( $(date +%s) + $(node -e "console.log(Math.round($H*3600))") )); rm -f $F/STOP; echo "$$ start $(date -Is) deadline $(date -d @$DL -Is) workers $NW" | tee $F/farm.pid.txt
for w in $(seq 1 $NW); do sh $D/worker.sh $w $DL & sleep 2; done; wait; echo "farm finished $(date -Is)"
