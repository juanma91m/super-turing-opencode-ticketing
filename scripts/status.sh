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
printf 'obsolete_ticketing_coupling_plugin_present=%s\n' "$([[ -f "$TARGET_DIR/plugins/ticketing-coupling.ts" ]] && printf yes || printf no)"
printf 'ticket_session_title_plugin_present=%s\n' "$([[ -f "$TARGET_DIR/plugins/ticket-session-title.ts" ]] && printf yes || printf no)"
printf 'plan_ticketing_guidance_present=%s\n' "$([[ -f "$TARGET_DIR/agents/plan.md" ]] && grep -q 'super-turing-opencode-ticketing' "$TARGET_DIR/agents/plan.md" 2>/dev/null && printf yes || printf no)"
printf 'build_ticketing_guidance_present=%s\n' "$([[ -f "$TARGET_DIR/agents/build.md" ]] && grep -q 'super-turing-opencode-ticketing' "$TARGET_DIR/agents/build.md" 2>/dev/null && printf yes || printf no)"
printf 'planner_ticketing_augmented=%s\n' "$([[ -f "$TARGET_DIR/agents/planner.md" && $(grep -c 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/planner.md" 2>/dev/null || true) -gt 0 ]] && printf yes || printf no)"
printf 'master_dev_ticketing_augmented=%s\n' "$([[ -f "$TARGET_DIR/agents/master-dev.md" && $(grep -c 'TICKETING_AUTONOMY_START' "$TARGET_DIR/agents/master-dev.md" 2>/dev/null || true) -gt 0 ]] && printf yes || printf no)"
python3 - "$TARGET_DIR/opencode.json" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text()) if path.exists() else {}
tools = data.get("tools", {})
planner_tools = data.get("agent", {}).get("planner", {}).get("tools", {})
expected = (
    "atlassian-rovo_search",
    "atlassian-rovo_fetch",
    "atlassian-rovo_getJiraIssue",
    "atlassian-rovo_getConfluencePage",
)
print("atlassian_rovo_mcp_configured=" + ("yes" if "atlassian-rovo" in data.get("mcp", {}) else "no"))
print("atlassian_rovo_globally_hidden=" + ("yes" if tools.get("atlassian-rovo_*") is False else "no"))
print("planner_rovo_read_tools_only=" + ("yes" if all(planner_tools.get(name) is True for name in expected) else "no"))
PY
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
