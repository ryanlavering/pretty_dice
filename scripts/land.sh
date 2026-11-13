#!/bin/sh
# Land the current lane branch (v4/<lane>) onto v4. One lander at a time (flock), so the rebase, the per-feature tests and the push
# all see the same v4. The push is a plain (non-force) push of HEAD to origin v4, so it can only fast-forward.
#   LAND_TESTS="tests/games.spec.mjs" sh scripts/land.sh
# LAND_TESTS = this feature's spec(s) only. Full regression is the integrator's periodic job, not yours.
set -e
lane=$(git rev-parse --abbrev-ref HEAD)
case "$lane" in v4/*) ;; *) echo "run from a v4/<lane> branch (you are on $lane)"; exit 1;; esac
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "commit your changes first"; exit 1; }
exec 9>/tmp/pretty-dice-land.lock
flock -w 1200 9 || { echo "land lock busy for 20 min: ask on the board"; exit 1; }
git fetch -q origin v4
git rebase origin/v4 || { git rebase --abort; echo "rebase conflict: rebase onto origin/v4 yourself, resolve, rerun"; exit 1; }
if [ -n "$LAND_TESTS" ]; then
  PD_LOCK_NOTE="land $lane: $LAND_TESTS" npm test -- $LAND_TESTS || { echo "feature tests failed: NOT landed"; exit 1; }
fi
git push origin HEAD:refs/heads/v4
sh "$(dirname "$0")/board.sh" "$lane" "LANDED $(git rev-parse --short HEAD) $(git log -1 --format=%s)"
echo "landed on origin/v4"
