#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
DRY_RUN=0
STATUS_ONLY=0

MANAGED_FILES=()

list_augmented_agents() {
  local result=()
  local candidate
  for candidate in planner master-dev agent-design; do
    if [[ -f "$TARGET_DIR/agents/$candidate.md" ]] && grep -q 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/$candidate.md" 2>/dev/null; then
      result+=("$candidate")
    fi
  done
  local IFS=,
  printf '%s' "${result[*]}"
}

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

load_managed_files() {
  mapfile -t MANAGED_FILES < <(
    python3 - "$SOURCE_DIR/STACK-MANIFEST.json" <<'PY'
import json, pathlib, sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
for item in data.get("managedFiles", []):
    print(item)
PY
  )
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --target-dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --status)
      STATUS_ONLY=1
      shift
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

load_managed_files

for rel_path in "${MANAGED_FILES[@]}"; do
  src="$SOURCE_DIR/$rel_path"
  dst="$TARGET_DIR/$rel_path"
  if [[ ! -e "$dst" ]]; then
    printf 'create %s\n' "$rel_path"
    if [[ "$STATUS_ONLY" -eq 0 ]]; then
      run mkdir -p "$(dirname "$dst")"
      run cp "$src" "$dst"
    fi
    continue
  fi
  if ! cmp -s "$src" "$dst"; then
    printf 'update %s\n' "$rel_path"
    if [[ "$STATUS_ONLY" -eq 0 ]]; then
      run cp "$src" "$dst"
    fi
  fi
done

if [[ "$STATUS_ONLY" -eq 0 ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] python3 %s apply --target-dir %s\n' "$SOURCE_DIR/scripts/manage_agent_autonomy.py" "$TARGET_DIR"
  else
    python3 "$SOURCE_DIR/scripts/manage_agent_autonomy.py" apply --target-dir "$TARGET_DIR"
    python3 "$SOURCE_DIR/scripts/manage_install_marker.py" write \
      --target-dir "$TARGET_DIR" \
      --repo-dir "$SOURCE_DIR" \
      --augmented-agents "$(list_augmented_agents)"
  fi
fi
