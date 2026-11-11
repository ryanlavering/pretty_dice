#!/bin/sh
# Runs a command while holding a machine-wide lock, so test runs from different sessions or worktrees queue up
# instead of piling onto the same CPUs (software WebGL uses every core, so two runs at once time each other out).
# Usage: sh scripts/with-test-lock.sh <command...>        e.g. sh scripts/with-test-lock.sh playwright test --project=fast
#
# The holder leaves a calling card (${LOCK}.card: who, where, branch, command, since, expected finish, note) and anyone
# waiting leaves one in ${LOCK}.queue/, so sessions can see each other: `npm run test:lock` shows both.
#   PD_LOCK_NOTE="why / what you need"   shown to the others (e.g. "release check, please don't start another full run")
#   PD_TEST_LOCK=<file>   lock file (default /tmp/pretty-dice-tests.lock, shared by every checkout)
#   PD_LOCK_WAIT=<secs>   give up waiting after this long (default 3600)
#   PD_NO_LOCK=1          skip the lock (CI, where nothing else shares the machine)
[ -n "$PD_NO_LOCK" ] && exec "$@"
LOCK=${PD_TEST_LOCK:-/tmp/pretty-dice-tests.lock}; CARD="$LOCK.card"; QUEUE="$LOCK.queue"; LAST="$LOCK.last"
mkdir -p "$QUEUE"
branch=$(git branch --show-current 2>/dev/null); [ -n "$branch" ] || branch="detached $(git rev-parse --short HEAD 2>/dev/null)"
now=$(date +%s)
card() {   # card <file> <state> <command...>
  f=$1; st=$2; shift 2
  { echo "state=$st"; echo "pid=$$"; echo "cwd=$PWD"; echo "branch=$branch"; echo "command=$*"; echo "since=$now"
    echo "since_text=$(date +%H:%M:%S)"; echo "expected_secs=$(cat "$LAST" 2>/dev/null || echo 900)"; echo "note=$PD_LOCK_NOTE"; } > "$f"
}
exec 9>>"$LOCK"
if ! flock -n 9; then
  echo "Another test run holds the lock. Holder's card:" >&2; sed 's/^/  /' "$CARD" >&2 2>/dev/null
  me="$QUEUE/$$"; card "$me" waiting "$@"; trap 'rm -f "$me"' EXIT INT TERM
  echo "Waiting (queued as pid $$; \`npm run test:lock\` shows who is ahead)..." >&2
  flock -w "${PD_LOCK_WAIT:-3600}" 9 || { echo "Gave up waiting for the test lock after ${PD_LOCK_WAIT:-3600}s." >&2; exit 1; }
  rm -f "$me"; trap - EXIT INT TERM; now=$(date +%s)
fi
card "$CARD" running "$@"; trap 'rm -f "$CARD"' EXIT
nice -n 10 "$@" & child=$!
trap 'kill $child 2>/dev/null' INT TERM
wait $child; rc=$?
[ $rc -ne 127 ] && echo $(( $(date +%s) - now )) > "$LAST"   # how long a run took, for the next holder's estimate
rm -f "$CARD"; exit $rc
