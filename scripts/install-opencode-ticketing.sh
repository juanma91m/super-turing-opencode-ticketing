#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
DRY_RUN=0

MANAGED_FILES=()
OBSOLETE_TARGETS=()

list_augmented_agents() {
  local result=()
  local candidate
  for candidate in planner master-dev; do
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

load_obsolete_targets() {
  mapfile -t OBSOLETE_TARGETS < <(
    python3 - "$SOURCE_DIR/STACK-MANIFEST.json" <<'PY'
import json, pathlib, sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
for item in data.get("obsoleteTargets", []):
    print(item)
PY
  )
}

ensure_primary_agent_templates() {
  local rel_path src dst
  for rel_path in agents/plan.md agents/build.md; do
    src="$SOURCE_DIR/$rel_path"
    dst="$TARGET_DIR/$rel_path"
    if [[ -e "$dst" ]]; then
      continue
    fi
    run mkdir -p "$(dirname "$dst")"
    run cp "$src" "$dst"
  done
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
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

load_managed_files
load_obsolete_targets
for rel_path in "${MANAGED_FILES[@]}"; do
  src="$SOURCE_DIR/$rel_path"
  dst="$TARGET_DIR/$rel_path"
  run mkdir -p "$(dirname "$dst")"
  run cp "$src" "$dst"
done

for rel_path in "${OBSOLETE_TARGETS[@]}"; do
  run rm -f "$TARGET_DIR/$rel_path"
done

ensure_primary_agent_templates

if [[ "$DRY_RUN" -eq 1 ]]; then
  python3 "$SOURCE_DIR/scripts/configure_ticketing.py" install \
    --config "$TARGET_DIR/opencode.json" \
    --mcp-fragment "$SOURCE_DIR/mcp/atlassian-rovo.json" \
    --dry-run
  printf '[dry-run] python3 %s remove --target-dir %s\n' "$SOURCE_DIR/scripts/manage_agent_autonomy.py" "$TARGET_DIR"
  printf '[dry-run] python3 %s apply --target-dir %s\n' "$SOURCE_DIR/scripts/manage_agent_autonomy.py" "$TARGET_DIR"
else
  python3 "$SOURCE_DIR/scripts/configure_ticketing.py" install \
    --config "$TARGET_DIR/opencode.json" \
    --mcp-fragment "$SOURCE_DIR/mcp/atlassian-rovo.json"
  python3 "$SOURCE_DIR/scripts/manage_agent_autonomy.py" remove --target-dir "$TARGET_DIR"
  python3 "$SOURCE_DIR/scripts/manage_agent_autonomy.py" apply --target-dir "$TARGET_DIR"
  python3 "$SOURCE_DIR/scripts/manage_install_marker.py" write \
    --target-dir "$TARGET_DIR" \
    --repo-dir "$SOURCE_DIR" \
    --augmented-agents "$(list_augmented_agents)"
fi

if [[ "$DRY_RUN" -eq 0 ]]; then
  printf '[ticketing] install finished\n'
fi
