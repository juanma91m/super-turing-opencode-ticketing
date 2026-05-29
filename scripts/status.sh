#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
MANAGED_FILES=()

usage() {
  cat <<'EOF'
Usage: status.sh [options]

Options:
  --target-dir <path>   Target OpenCode config dir (default: ~/.config/opencode)
  -h, --help            Show this help
EOF
}

load_managed_files() {
  mapfile -t MANAGED_FILES < <(
    python3 - "$REPO_DIR/STACK-MANIFEST.json" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text())
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
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

load_managed_files

missing=0
mismatched=0

for rel_path in "${MANAGED_FILES[@]}"; do
  src="$REPO_DIR/$rel_path"
  dst="$TARGET_DIR/$rel_path"
  if [[ ! -e "$dst" ]]; then
    missing=$((missing + 1))
    continue
  fi
  if ! cmp -s "$src" "$dst"; then
    mismatched=$((mismatched + 1))
  fi
done

printf 'target_dir=%s\n' "$TARGET_DIR"
printf 'managed_files_total=%s\n' "${#MANAGED_FILES[@]}"
printf 'managed_files_missing=%s\n' "$missing"
printf 'managed_files_mismatched=%s\n' "$mismatched"
printf 'ticketing_coupling_plugin_present=%s\n' "$([[ -f "$TARGET_DIR/plugins/ticketing-coupling.ts" ]] && printf yes || printf no)"
printf 'plan_ticketing_overlay_present=%s\n' "$([[ -f "$TARGET_DIR/agents/plan.md" ]] && grep -q 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/plan.md" 2>/dev/null && printf yes || printf no)"
printf 'build_ticketing_overlay_present=%s\n' "$([[ -f "$TARGET_DIR/agents/build.md" ]] && grep -q 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/build.md" 2>/dev/null && printf yes || printf no)"
printf 'planner_ticketing_augmented=%s\n' "$([[ -f "$TARGET_DIR/agents/planner.md" && $(grep -c 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/planner.md" 2>/dev/null || true) -gt 0 ]] && printf yes || printf no)"
printf 'master_dev_ticketing_augmented=%s\n' "$([[ -f "$TARGET_DIR/agents/master-dev.md" && $(grep -c 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/master-dev.md" 2>/dev/null || true) -gt 0 ]] && printf yes || printf no)"
printf 'agent_design_ticketing_augmented=%s\n' "$([[ -f "$TARGET_DIR/agents/agent-design.md" && $(grep -c 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/agent-design.md" 2>/dev/null || true) -gt 0 ]] && printf yes || printf no)"
printf 'install_marker_present=%s\n' "$([[ -f "$TARGET_DIR/.opencode-ticketing-addon.json" ]] && printf yes || printf no)"

if [[ -f "$TARGET_DIR/.opencode-ticketing-addon.json" ]]; then
  printf '\n## Install marker\n'
  python3 - <<'PY' "$TARGET_DIR/.opencode-ticketing-addon.json"
import json
import sys
from pathlib import Path
path = Path(sys.argv[1])
data = json.loads(path.read_text())
for key in ("addonId", "version", "installedAt"):
    print(f"{key}={data.get(key)}")
print("augmentedAgents=" + ",".join(data.get("augmentedAgents", [])))
PY
fi
