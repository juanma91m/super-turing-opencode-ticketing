#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
DRY_RUN=0
MANAGED_FILES=()

usage() {
  cat <<'EOF'
Usage: uninstall.sh [options]

Options:
  --target-dir <path>   Target OpenCode config dir (default: ~/.config/opencode)
  --dry-run             Show actions without writing files
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

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
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

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '[dry-run] python3 %s remove --target-dir %s\n' "$REPO_DIR/scripts/manage_agent_autonomy.py" "$TARGET_DIR"
else
  python3 "$REPO_DIR/scripts/manage_agent_autonomy.py" remove --target-dir "$TARGET_DIR"
  python3 "$REPO_DIR/scripts/manage_install_marker.py" remove --target-dir "$TARGET_DIR"
fi

for rel_path in "${MANAGED_FILES[@]}"; do
  dst="$TARGET_DIR/$rel_path"
  if [[ ! -e "$dst" ]]; then
    continue
  fi
  run rm -f "$dst"
done

if [[ "$DRY_RUN" -eq 0 ]]; then
  printf '[ticketing] uninstall finished\n'
fi
