#!/bin/sh
# Run the Playwright suite inside the pinned image. Visual baselines are only made and compared here.
# Usage: sh scripts/test-docker.sh [playwright args]   e.g. --update-snapshots, tests/visual.spec.mjs
set -e
IMG=mcr.microsoft.com/playwright:v1.64.1-noble
cd "$(dirname "$0")/.."
exec docker run --rm --ipc=host --init \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e PD_DOCKER=1 -e CI -e PD_WORKERS \
  -v "$PWD":/work -w /work "$IMG" npx playwright test --project=fast "$@"
