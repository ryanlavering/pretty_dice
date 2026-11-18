# sec.sh <file> <start marker substring> <next marker substring> -> "a-b" (from start marker line to the line before the next marker)
a=$(grep -n -F -- "$2" "$1" | head -1 | cut -d: -f1); b=$(grep -n -F -- "$3" "$1" | head -1 | cut -d: -f1); echo "$a-$((b-1))"
