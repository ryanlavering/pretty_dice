#!/bin/sh
# Who holds the test lock, who is waiting, and when it should free up. Usage: npm run test:lock
LOCK=${PD_TEST_LOCK:-/tmp/pretty-dice-tests.lock}; CARD="$LOCK.card"; QUEUE="$LOCK.queue"
get() { sed -n "s/^$2=//p" "$1" | head -1; }
show() {   # show <card file>
  echo "  $(get "$1" state) pid $(get "$1" pid) · $(get "$1" branch) · $(get "$1" cwd)"
  echo "    $(get "$1" command)"
  s=$(get "$1" since); e=$(get "$1" expected_secs); note=$(get "$1" note)
  [ "$(get "$1" state)" = running ] && echo "    started $(get "$1" since_text), about $(( (s + e - $(date +%s)) / 60 )) min left (last run took ${e}s)"
  [ -n "$note" ] && echo "    note: $note"
}
exec 9>>"$LOCK"
if flock -n 9; then echo "Test lock is free."; else
  echo "Test lock is held by:"; [ -f "$CARD" ] && show "$CARD" || echo "  (no card: a run that started before cards existed)"; fi
n=0; for q in "$QUEUE"/*; do [ -f "$q" ] || continue; p=$(get "$q" pid); kill -0 "$p" 2>/dev/null || { rm -f "$q"; continue; }
  [ $n -eq 0 ] && echo "Waiting:"; n=$((n+1)); show "$q"; done
[ $n -eq 0 ] && echo "Nobody is waiting."
exit 0
