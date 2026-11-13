#!/bin/sh
# Shared coordination board for parallel v4 sessions (lives outside git so every worktree sees it).
#   sh scripts/board.sh <lane> "message"   append a line
#   sh scripts/board.sh tail [n]           show the last n lines (default 30)
# Message conventions: TOUCHING <file/area>, LANDED <sha> <subject>, NEED <lane>: <ask>, BLOCKED <why>, READY, CHECKPOINT <n> green|red <detail>
f=${PD_BOARD:-/home/ryan/code/pretty_dice-coord/board.md}
mkdir -p "$(dirname "$f")"; touch "$f"
case "$1" in
  tail|"") tail -n "${2:-30}" "$f" ;;
  *) printf '%s [%s] %s\n' "$(date '+%m-%d %H:%M')" "$1" "$2" >> "$f" ;;
esac
