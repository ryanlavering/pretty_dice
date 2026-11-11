#!/bin/sh
# Runs a command while holding a machine-wide lock, so test runs from different sessions or worktrees queue up
# instead of piling onto the same CPUs (software WebGL uses every core, so two runs at once time each other out).
# Usage: sh scripts/with-test-lock.sh <command...>        e.g. sh scripts/with-test-lock.sh playwright test --project=fast
# PD_TEST_LOCK=<file>   lock file (default /tmp/pretty-dice-tests.lock, shared by every checkout)
# PD_LOCK_WAIT=<secs>   give up waiting after this long (default 3600)
# PD_NO_LOCK=1          skip the lock (CI, where nothing else shares the machine)
[ -n "$PD_NO_LOCK" ] && exec "$@"
LOCK=${PD_TEST_LOCK:-/tmp/pretty-dice-tests.lock}
exec 9>>"$LOCK"
if ! flock -n 9; then
  echo "Another test run holds $LOCK ($(tr '\n' ' ' < "$LOCK")). Waiting for it to finish..." >&2
  flock -w "${PD_LOCK_WAIT:-3600}" 9 || { echo "Gave up waiting for the test lock after ${PD_LOCK_WAIT:-3600}s." >&2; exit 1; }
fi
printf 'pid %s in %s since %s\n' "$$" "$PWD" "$(date +%H:%M:%S)" > "$LOCK"   # who holds it, for the message above
exec nice -n 10 "$@"
