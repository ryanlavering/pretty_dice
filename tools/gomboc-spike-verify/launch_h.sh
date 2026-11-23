#!/bin/sh
cd "$(dirname "$0")"; exec timeout $(( $4 + 300 )) python3 r17_homo.py runs/r16/$1.json $3 $4 $2 0.04 > runs/r17/log_homo_$2.txt 2>&1
