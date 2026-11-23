#!/bin/sh
# one farm worker loop: sh worker.sh <worker-id> <deadline-epoch>
D=$(cd "$(dirname "$0")" && pwd); T=$D/..; F=${FARM_DIR:-$D/../../../runs/farm}; mkdir -p $F/work $F/bodies; ID=$1; DL=$2; export FARM_DIR=$F
PERSARGS="--mode target --margin 0.02 --plevel 5 --pw 1000"
i=0
while [ ! -e $F/STOP ] && [ $(date +%s) -lt $DL ]; do
  i=$((i+1)); W=$F/work/w${ID}_$(date +%Y%m%d_%H%M%S)_$i; mkdir -p $W
  JOB=$(nice -n 10 node $D/pick.mjs $W); echo "$JOB" > $W/job.json
  SEED=$(echo "$JOB"|node -e "console.log(JSON.parse(require('fs').readFileSync(0)).seed)"); TGT=$(echo "$JOB"|node -e "console.log(JSON.parse(require('fs').readFileSync(0)).target)")
  GENS=$(echo "$JOB"|node -e "console.log(JSON.parse(require('fs').readFileSync(0)).gens)"); SIG=$(echo "$JOB"|node -e "console.log(JSON.parse(require('fs').readFileSync(0)).sigma)"); KIND=$(echo "$JOB"|node -e "console.log(JSON.parse(require('fs').readFileSync(0)).kind)")
  echo "[$(date +%T)] w$ID iter $i job $JOB"
  rej(){ node -e "const fs=require('fs');fs.appendFileSync('$F/rejects.jsonl',JSON.stringify({t:new Date().toISOString(),seed:$SEED,target:$TGT,kind:'$KIND',failed:'$1',detail:process.argv[1]||null,dir:'$W'})+'\n')" "$2"; echo "[$(date +%T)] w$ID reject $1 $2"; }
  (cd $T && nice -n 10 node ring-pers.mjs $PERSARGS --target $TGT --seed $SEED --gens $GENS --sigma $SIG --lam 16 --start $W/start.json --out $W/run.json > $W/cma.out 2> $W/cma.log) || { rej cma_crash ""; continue; }
  CHK=$(node -e "const r=JSON.parse(require('fs').readFileSync('$W/run.json'));console.log(Math.abs(r.ratio-$TGT)<0.004&&r.badness<5e-5&&r.convMargin>0.01?'ok':'no ratio='+r.ratio.toFixed(4)+' bad='+r.badness.toExponential(1)+' margin='+r.convMargin.toFixed(3))")
  [ "$CHK" = ok ] || { rej cma_cost "$CHK"; continue; }
  DD=$(nice -n 10 node $D/dedupe.mjs $W/run.json); case "$DD" in *'"dup":true'*) rej dup "$DD"; continue;; esac
  nice -n 10 node $D/verify-body.mjs $W/run.json $W > $W/verify.json 2> $W/verify.err || { rej verify_crash ""; continue; }
  if node -e "process.exit(JSON.parse(require('fs').readFileSync('$W/verify.json')).ok?0:1)"; then
    R=$(nice -n 10 node $D/add-body.mjs $W/run.json $W/verify.json $W $SEED $TGT $KIND 2>>$W/add.err); echo "[$(date +%T)] w$ID $R"; case "$R" in DUP*) rej dup_late "$R";; esac
  else FL=$(node -e "const j=JSON.parse(require('fs').readFileSync('$W/verify.json'));console.log(j.failed)"); rej "$FL" "$(cat $W/verify.json | cut -c1-300)"; fi
done
echo "[$(date +%T)] worker $ID done"
